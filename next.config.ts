import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 스펙 문서와 O*NET 데이터는 서버가 실행 중에 파일로 읽는다. 배포 때 함께 포함시킨다.
  outputFileTracingIncludes: {
    "/api/**/*": ["./specs/**/*", "./data/**/*"],
  },
};

export default nextConfig;
