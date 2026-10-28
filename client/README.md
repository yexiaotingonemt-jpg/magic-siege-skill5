# 桌面客户端

默认客户端已改为Electron Windows桌面应用。完整解压桌面发布包，双击`魔法王座.exe`，直接进入独立游戏窗口；无需安装Node.js或浏览器，也不需要运行CMD。必须保留EXE旁边的DLL、locales及resources目录。

通过窗口菜单“游戏 → 服务器设置”填写管理员提供的地址，保存后自动切换服务器。菜单还提供重新连接、F11全屏和退出。关闭游戏窗口即退出本地服务，远端服务器继续运行。

服务器设置与桌面登录会话保存在`%APPDATA%/Magic Siege/`的用户数据中，完整换包时保留。新玩家的默认地址可在EXE同目录的`client-config.json`中预先设置；个人保存的地址优先。`MAGIC_SERVER_URL`可用于开发和测试覆盖。

桌面版发布版本为0.3.0，必须连接相同版本服务端。版本不符会在游戏窗口内提示更新；更新时先退出游戏，再完整解压新包。

## 桌面开发与打包

开发机使用Node.js 22.12+，执行`npm ci`、`npm run setup:desktop`、`npm run build`，分别运行`npm run start:server`和`npm run start:client`。Electron运行环境通过官方发布包安装；下载受限时可按Electron支持的镜像/缓存方式安装，并校验官方SHA-256。

`npm run package:client -- --server https://game.example.com`或`npm run package:desktop -- --server https://game.example.com`生成桌面ZIP、EXE和校验文件。包内`resources/app.asar`只包含桌面入口、已构建前端、资源代理和协议常量，不包含战斗服务器、账号或构建依赖。

`npm run test:desktop`使用Playwright直接启动Electron，覆盖登录、契约、本地资源、关闭清理、会话恢复、设置切换与强制更新。通过`MAGIC_DESKTOP_EXE`指定已打包EXE可复用相同验收。

## 浏览器开发模式（兼容工具）

以下为旧版浏览器运行方式，保留用于开发。使用`npm run start:browser`启动，或用`npm run package:browser`生成浏览器包；玩家分发默认使用上面的桌面版。

每位玩家持有独立客户端文件，共同连接一台战斗服务器。页面、JS、CSS及美术都从本机读取；远端只处理账号、操作和战场同步。

## 玩家使用

1. 完整解压客户端发布包。
2. 管理者提前将 `client/client-config.json` 中的 `serverUrl` 改为实际服务地址，如 `https://game.example.com` 或 `http://192.168.1.10:5183`。不能包含路径或账号信息。
3. Windows双击包根目录的 `Start-Client.cmd`。附带 `client/runtime/node.exe` 时无需安装任何依赖。
4. 浏览器自动打开本机 `http://127.0.0.1:5184/`，注册或登录自己的账号。
5. 保持启动窗口运行；关闭窗口会关闭本地服务。战局由远端维持，不会为每位玩家新建战斗服务器。

首次地址默认为 `http://127.0.0.1:5183`，仅适合同机开发，分发前必须换成所有玩家都能访问的真实服务器地址。

`port` 是本地客户端端口，与远端端口无关；端口被占用时可更改。`openBrowser: false` 可禁止自动打开浏览器。环境变量 `MAGIC_SERVER_URL`、`CLIENT_PORT` 可覆盖地址和本地端口；命令行也支持 `node client/launcher.mjs --server https://game.example.com`。

## 资源与网络

本地启动器只监听127.0.0.1，从 `dist/` 提供文件，只将 `/api/` 转发到指定服务器。账号Cookie通过本地代理保存于当前浏览器，不使用跨域Cookie或开放CORS；SSE持续转发且浏览器保持重连机制。远端HTTPS的证书验证保持开启。

不要直接双击 `dist/index.html`。浏览器对file://下的模块、请求和美术资源存在限制，因此由附带的本地启动器打开页面。

本地资源能减少首次进入战场时的网络下载量；战斗同步延迟仍取决于玩家与服务器之间的网络。本地客户端仍需要联网登录和战斗。

## 开发、打包与更新

源码根目录执行 `npm run build`，产物在 `client/dist/`。执行 `npm run start:browser` 启动兼容浏览器客户端；战斗服务器另行运行 `npm run start:server`。

执行 `npm run package:browser -- --server https://game.example.com` 生成兼容浏览器包。在Windows构建时默认附带当前Node.js可执行文件及许可证，适配当前构建机的CPU架构。`--no-runtime` 生成需另行安装Node.js的包。其他系统可运行 `node client/launcher.mjs`，需要安装兼容的Node.js。

Windows打包时会下载当前Node.js版本的完整官方许可证；离线打包可用环境变量`NODE_LICENSE_FILE`指定已保存的该版本许可证文件。

更新时关闭旧启动器，完整解压新包再启动，保留或重填服务器地址。账号数据由远端保存，浏览器Cookie无需随客户端文件分发。每次对外发布都要增加 `shared/protocol.js` 的 `GAME_VERSION` 并同步发布两端；API或快照不兼容时另增 `PROTOCOL_VERSION`。客户端与服务器版本必须完全相同。

## 强制更新

启动、登录和连接战场时校验版本，版本不一致时显示“请更新客户端”，列出本机版本与服务器要求版本，不提供登录或战场入口。在线时服务器升级，重连也会进入更新页并停止自动重试。关闭旧启动器、完整解压正确版本再启动。

本地启动器不会替缺少版本号的旧页面补填当前游戏版本；旧浏览器缓存无法绕过版本限制。打包时同时检查构建版本清单，防止把旧界面资源与新启动器混装。
