declare module "alawmulaw" {
  interface Codec {
    decode(samples: Uint8Array): Int16Array;
    encode(samples: Int16Array): Uint8Array;
  }
  const alaw: Codec;
  const mulaw: Codec;
  export { alaw, mulaw };
}
