# 战斗服务端

入口为 `index.mjs`。只依赖Node.js内置模块和 `../shared/`，不依赖客户端、Phaser、美术或 `node_modules`。

在源码根目录执行 `npm run start:server`，或在独立服务端包内执行 `node server/index.mjs`。默认监听 `0.0.0.0:5183`；用 `HOST`、`PORT` 覆盖，账号目录用 `KC_DATA_DIR` 指定。

服务只接受API请求，不提供HTML、脚本或图片。客户端必须安装在玩家本机，并把配置中的 `serverUrl` 指向本服务。每个进程拥有独立战场，当前只部署一个实例。

战场SSE默认按客户端的 `Accept-Encoding` 协商流式Gzip；每个完整事件使用 `Z_SYNC_FLUSH` 及时输出，保留压缩字典，广播间隔仍为200毫秒。压缩级别为1，优先减少CPU开销。不支持Gzip的连接使用原文；设置 `MAGIC_SSE_GZIP=0` 并重启服务可关闭压缩。消息结构与协议版本不变，现有客户端代理可直接透传。压缩流和HTTP连接共同参与背压检查，断线会释放压缩器。

对照测试：`node scripts/benchmark-sse.mjs`。同一战场各连接一半原文、一半Gzip，经过实际本地启动器代理，对比相同状态的线上编码字节和广播到完整消息解析的延迟；默认每连接60帧，测试2/10/20个总连接。输出默认在系统临时目录，可用 `MAGIC_BENCH_DIR` 指定报告目录，用 `MAGIC_BENCH_FRAMES` 调整帧数。该测试不代表公网延迟或服务器最大承载量。

账号、密码哈希和阵营存于 `accounts.json`；会话、战局、等级、体力、积分和房主临时配置仅在内存中，重启会重置。

运维步骤见 [部署说明](../deploy/README.md)。

版本限制由 `../shared/protocol.js` 的 `GAME_VERSION` 定义。所有游戏接口严格检查客户端发布版本和协议版本，缺失或不匹配时返回HTTP 409，错误码为`CLIENT_UPDATE_REQUIRED`。`GET /api/version`与健康检查保持公开，以便客户端展示更新要求与运维探测。
