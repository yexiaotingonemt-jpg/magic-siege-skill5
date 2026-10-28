# 魔法王座桌面客户端

完整解压发布包，双击“魔法王座.exe”，直接进入独立游戏窗口。客户端自动连接 http://124.222.216.66:5183，玩家无需填写或选择服务器。旧版保存的个人服务器地址和EXE旁的地址文件不会覆盖内置地址。

无需安装Node.js、浏览器或运行CMD。请保留同目录DLL、locales与resources，不能只复制EXE。关闭窗口即可退出；账号和阵营由服务端保存，登录会话保存在本机用户目录。菜单保留重新连接、F11全屏与退出。

正式发布时客户端与服务器使用同一个发布版本号，数值、服务端代码、界面或资源更新都同步提升两端发布号并配套发布。战斗兼容标记按兼容性需要调整。详见[统一版本发布约定](../docs/版本发布约定.md)及[版本说明](../README.md#版本限制)。

发现新客户端时窗口显示下载进度，下载完成后自动替换游戏文件并重启。网络中断自动重试并续传；签名或文件校验失败不会安装，启动失败自动回滚。用户资料保留在独立的本机用户目录，账号保存在服务器。请首次将完整游戏文件夹放在当前用户可写的普通目录，并保留足够磁盘空间。旧0.3.0客户端没有更新器，首次仍需换用这个新包，后续无需手动下载、解压、替换。

## 开发与验证

开发机使用Node.js 22.12+，执行npm ci、npm run setup:desktop、npm run build，再分别运行npm run start:server与npm run start:client。默认地址位于client/client-config.json，内置于桌面包；仅开发测试模式可用MAGIC_SERVER_URL覆盖。

npm run package:client生成Windows桌面ZIP、EXE与校验文件；npm run test:desktop验证登录、契约、退出、会话恢复、默认地址和版本限制。MAGIC_DESKTOP_EXE可指定已打包EXE进行相同验收。

npm run start:browser和npm run package:browser保留浏览器开发工具，不作为默认玩家客户端。
