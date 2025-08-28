import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

export default withSerwist({
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
});
