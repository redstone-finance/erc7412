import * as viem from "viem";
import { Adapter } from "../adapter";
import { DataServiceWrapper } from "@redstone-finance/evm-connector";

export class RedstoneAdapter implements Adapter {
  constructor(public dataServiceId: string) {}

  getOracleId(): string {
    return "REDSTONE";
  }

  async fetchOffchainData(
    _client: viem.Client,
    _requester: viem.Address,
    data: viem.Hex
  ): Promise<viem.Hex> {
    const [feedId] = viem.decodeAbiParameters([{ type: "bytes32" }], data) as [
      string
    ];

    const signedRedstonePayload = await new DataServiceWrapper({
      dataServiceId: this.dataServiceId,
      uniqueSignersCount: 3,
      dataFeeds: [bytes32ToString(feedId)],
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
