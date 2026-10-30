# 魔法王座桌面客户端

完整解压发布包，双击“魔法王座.exe”，直接进入独立游戏窗口。客户端自动连接 http://124.222.216.66:5183，玩家无需填写或选择服务器。旧版保存的个人服务器地址和EXE旁的地址文件不会覆盖内置地址。

无需安装Node.js、浏览器或运行CMD。请保留同目录DLL、locales与resources，不能只复制EXE。关闭窗口即可退出；账号和阵营由服务端保存，登录会话保存在本机用户目录。桌面客户端在登录或注册成功后使用系统加密保存本服务器上次使用的账号和密码，下次显示登录页时自动回填；退出账号仍保留，登录失败不会覆盖记录，创建账号页不回填已有密码。旧版会话用户需首次重新登录一次才能保存密码。菜单保留重新连接、F11全屏与退出。

客户端发布版本、战斗兼容版本及协议必须与服务器一致，否则禁止进入游戏。请退出游戏，在 GitHub Desktop 拉取最新版完整仓库，再双击仓库中的魔法王座.exe。客户端不会自动下载、安装或切换版本。

请完整保留 desktop-client.json、client/prebuilt、desktop-runtime 与美术文件。登录资料位于独立用户目录，拉取仓库不会清除账号密码。正式发布保持两端同版本，流程见[统一版本发布约定](../docs/版本发布约定.md)。

## 桌面快捷方式图标

正式桌面图标采用深绿与古金色的王冠、王座盾徽：[Windows ICO](desktop/assets/magic-throne.ico)，[可编辑SVG源图](desktop/assets/magic-throne.svg)。ICO包含16、24、32、48、64、96、128及256像素尺寸，背景透明。

在Windows中为完整仓库内的“魔法王座.exe”创建桌面快捷方式，右键快捷方式→属性→快捷方式→更改图标，选择仓库中的`client/desktop/assets/magic-throne.ico`。图标文件须保留在原位置；更换图标不会修改启动目标、参数、EXE或发布文件校验清单。若启动目录有未提交的桌面端代码修改，应使用校验完整的发布副本启动，不要绕过发布校验。

## 开发与验证

开发机使用Node.js 22.12+，执行npm ci、npm run setup:desktop、npm run build，再分别运行npm run start:server与npm run start:client。默认地址位于client/client-config.json，内置于桌面包；仅开发测试模式可用MAGIC_SERVER_URL覆盖。

npm run package:client生成Windows桌面ZIP、EXE与校验文件；npm run test:desktop验证登录、契约、退出、会话恢复、默认地址和版本限制。MAGIC_DESKTOP_EXE可指定已打包EXE进行相同验收。

npm run start:browser和npm run package:browser保留浏览器开发工具，不作为默认玩家客户端。
