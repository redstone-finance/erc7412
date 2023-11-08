// @ts-nocheck
import {
    ChainDefinition,
    build,
    getFoundryArtifact,
    getProvider,
    runRpc,
} from "@usecannon/cli";
import * as viem from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { RedstoneAdapter } from "../dist/src/adapters/redstone.js";
import eip7412 from "../dist/src/index.js";

async function generate7412CompatibleCall(
    client,
    multicallFunc,
    addressToCall,
    functionName
) {
    const adapters = [];
    adapters.push(new RedstoneAdapter('redstone-primary-prod'));

    const converter = new eip7412.EIP7412(adapters, multicallFunc);

    return await converter.enableERC7412(client, {
        to: addressToCall,
        data: functionName,
    });
}

async function makeTestEnv() {
    const node = await runRpc({ port: 8545, chainId: 13370 });

    const info = await build({
        provider: getProvider(node),
        packageDefinition: { name: "erc7412Redstone", version: "0.0.4" },
        wipe: true,
        getArtifact: getFoundryArtifact,
        def: new ChainDefinition({
            name: "erc7412Redstone",
            version: "0.0.1",
            contract: {
                Multicall: {
                    artifact: "Multicall3_1",
                },
                ERC7412RedstoneFeed: {
                    artifact: "ERC7412RedstoneFeed",
                },
            },
        }),
    });

    return info;
}

async function runRedstoneExample() {
    const netInfo = await makeTestEnv();

    const senderAddr = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    const redstoneFeedAddress = netInfo.outputs.contracts.ERC7412RedstoneFeed.address;
    const redstoneFeedCallData = viem.encodeFunctionData({
        abi: netInfo.outputs.contracts.ERC7412RedstoneFeed.abi,
        functionName: "getLatestValue",
        args: [],
    });

    function makeMulticall(calls) {
        const ret = viem.encodeFunctionData({
            abi: netInfo.outputs.contracts.Multicall.abi,
            functionName: "aggregate3Value",
            args: [
                calls.map((call) => ({
                    target: call.to,
                    callData: call.data,
                    value: call.value || 0n,
                    allowFailure: false,
                })),
            ],
        });

        let totalValue = 0n;
        for (const call of calls) {
            totalValue += call.value || 0n;
        }

        return {
            account: senderAddr,
            to: netInfo.outputs.contracts.Multicall.address,
            data: ret,
            value: totalValue.toString(),
        };
    }

    const walletConfig = {
        chain: {
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            id: 13370,
            rpcUrls: { default: { http: ["http://localhost:8545"] } },
        },
        transport: viem.custom({
            request: async (req) => {
                const res = await netInfo.provider.send(req.method, req.params);
                return res;
            },
        }),
    };

    const client = viem.createPublicClient(walletConfig);

    const walletClient = viem.createWalletClient({
        account: privateKeyToAccount(
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        ),
        transport: walletConfig.transport,
        chain: walletConfig.chain,
    });

    const tx = await generate7412CompatibleCall(
        client,
        makeMulticall,
        redstoneFeedAddress,
        redstoneFeedCallData
    );
    console.log("Sending multicall transaction with oracle data");
    const hash = await walletClient
        .sendTransaction({
            account: senderAddr,
            to: tx.to,
            data: tx.data,
            value: tx.value,
        });

    console.log("Multicall transaction hash: " + hash);

    await client.waitForTransactionReceipt({ hash })
    console.log("Multicall transaction mined");
    const res = await client
        .readContract({
            address: redstoneFeedAddress,
            abi: netInfo.outputs.contracts.ERC7412RedstoneFeed.abi,
            functionName: "getLatestValue",
            args: [],
        });

    console.log(`Oracle data BTC price: "${res}" is available on chain`);

    process.exit(0);
}
runRedstoneExample();


