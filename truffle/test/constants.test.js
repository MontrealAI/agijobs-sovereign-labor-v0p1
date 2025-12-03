const ConstantsHarness = artifacts.require("ConstantsHarness");

contract("ConstantsHarness", () => {
  it("mirrors the canonical AGIALPHA address", async () => {
    const harness = await ConstantsHarness.new();
    const token = await harness.agiAlpha();
    const expected = web3.utils.toChecksumAddress("0xa61a3b3a130a9c20768eebf97e21515a6046a1fa");

    assert.equal(token, expected);
  });
});
