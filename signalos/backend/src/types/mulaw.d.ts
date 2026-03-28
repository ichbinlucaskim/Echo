declare module "alawmulaw" {
  interface Codec {
    decode(samples: Uint8Array | number[]): number[];
    encode(samples: number[]): number[];
  }
  const alaw: Codec;
  const mulaw: Codec;
  export { alaw, mulaw };
}
