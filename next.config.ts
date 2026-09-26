import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 스펙 문서와 O*NET 데이터는 서버가 실행 중에 파일로 읽는다. 배포 때 함께 포함시킨다.
  // onnxruntime-node(검색 문장 임베딩)는 transformers.js가 createRequire로 불러와서 자동 추적에 잡히지 않는다.
  // 배포 서버(리눅스 x64)용 실행 파일만 넣는다.
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./specs/**/*",
      "./data/**/*",
      "./node_modules/onnxruntime-node/package.json",
      "./node_modules/onnxruntime-node/dist/**/*",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*",
    ],
  },
  outputFileTracingExcludes: {
    "/api/**/*": ["./data/onet31/eval/**/*"],
  },
};

export default nextConfig;
