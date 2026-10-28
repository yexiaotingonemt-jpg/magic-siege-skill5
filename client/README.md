# 魔法王座桌面客户端

完整解压发布包，双击“魔法王座.exe”，直接进入独立游戏窗口。客户端自动连接 http://124.222.216.66:5183，玩家无需填写或选择服务器。旧版保存的个人服务器地址和EXE旁的地址文件不会覆盖内置地址。

无需安装Node.js、浏览器或运行CMD。请保留同目录DLL、locales与resources，不能只复制EXE。关闭窗口即可退出；账号和阵营由服务端保存，登录会话保存在本机用户目录。菜单保留重新连接、F11全屏与退出。

客户端与服务器版本必须一致，当前为0.3.0。版本不符时显示更新要求，退出旧版并完整换包后再启动。

## 开发与验证

开发机使用Node.js 22.12+，执行npm ci、npm run setup:desktop、npm run build，再分别运行npm run start:server与npm run start:client。默认地址位于client/client-config.json，内置于桌面包；仅开发测试模式可用MAGIC_SERVER_URL覆盖。

npm run package:client生成Windows桌面ZIP、EXE与校验文件；npm run test:desktop验证登录、契约、退出、会话恢复、默认地址和版本限制。MAGIC_DESKTOP_EXE可指定已打包EXE进行相同验收。

npm run start:browser和npm run package:browser保留浏览器开发工具，不作为默认玩家客户端。
