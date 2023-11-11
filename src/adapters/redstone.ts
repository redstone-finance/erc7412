import { DataServiceWrapper } from "@redstone-finance/evm-connector";
import * as viem from "viem";
import { Adapter } from "../adapter";

export class RedstoneAdapter implements Adapter {
  getOracleId(): string {
    return "REDSTONE";
  }

  async fetchOffchainData(
    client: viem.Client,
    requester: viem.Address,
    data: viem.Hex
  ): Promise<viem.Hex> {
    const [feedId] = viem.decodeAbiParameters([{ type: "bytes32" }], data) as [
      string
    ];

    const { dataServiceId, uniqueSignersCount } =
      await this.fetchParamsFromContract(client, requester);

    const signedRedstonePayload = await new DataServiceWrapper({
      dataFeeds: [bytes32ToString(feedId)],
      dataServiceId,
      uniqueSignersCount,
    }).prepareRedstonePayload(true);

    return `0x${signedRedstonePayload}`;
  }

  private async fetchParamsFromContract(
    client: viem.Client,
    contractAddress: viem.Address
  ): Promise<{ dataServiceId: string; uniqueSignersCount: number }> {
    const dataServiceIdResponse = await client.request({
      method: "eth_call",
      params: [
        {
          to: contractAddress,
          data: "0xc274583a",
        },
      ],
    });
    const dataServiceId = viem
      .decodeAbiParameters([{ type: "string" }], dataServiceIdResponse)
      .at(0) as string;

    const uniqueSignersCountResponse = await client.request({
      method: "eth_call",
      params: [
        {
          to: contractAddress,
          data: "0xf90c4924",
        },
      ],
    });

    const uniqueSignersCount = viem
      .decodeAbiParameters([{ type: "uint8" }], uniqueSignersCountResponse)
      .at(0) as number;

    return { uniqueSignersCount, dataServiceId };
  }
}

const bytes32ToString = (bytes32: string) => {
  const arrayOfChars = bytes32.slice(2).split("");

  while (arrayOfChars[arrayOfChars.length - 2] === "0") {
    arrayOfChars.pop();
  }

  return Buffer.from(arrayOfChars.join(""), "hex").toString();
};
