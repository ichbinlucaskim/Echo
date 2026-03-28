declare module "alawmulaw" {
  export interface Codec {
    decode(samples: Uint8Array | number[]): number[];
    encode(samples: number[]): number[];
  }
  export const alaw: Codec;
  export const mulaw: Codec;
}
