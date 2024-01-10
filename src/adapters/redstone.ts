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
    const [feedId, uniqueSignersCount, dataServiceId] = viem.decodeAbiParameters([{ type: "bytes32" }, { type: "uint8" }, { type: "string" }], data) as [
      string, number, string
    ];

    console.log("decoded query data",{feedId,uniqueSignersCount,dataServiceId});

    const signedRedstonePayload = await new DataServiceWrapper({
      dataFeeds: [bytes32ToString(feedId)],
      dataServiceId,
      uniqueSignersCount,
    }).prepareRedstonePayload(true);

    return `0x${signedRedstonePayload}`;
  }

}

const bytes32ToString = (bytes32: string) => {
  const arrayOfChars = bytes32.slice(2).split("");

  while (arrayOfChars[arrayOfChars.length - 2] === "0") {
    arrayOfChars.pop();
  }

  return Buffer.from(arrayOfChars.join(""), "hex").toString();
};
