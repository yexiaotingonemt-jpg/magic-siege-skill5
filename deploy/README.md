# 独立战斗服务端部署

服务端增量热更及保留/重开战局的命令流程见[服务端热更](../docs/服务端热更.md)。首次启用需常规部署，后续兼容更新可在同一进程中生效。

正式服务器及现有密钥的本机读取方式见[服务器连接与密钥](../docs/服务器连接与密钥.md)。后续操作优先使用已保存的凭据，无需从历史对话重新查找。

服务端只使用Node.js内置模块和`shared/`中的规则源码，不提供网页、JS或美术资源。服务器只上传服务端包；每位玩家安装独立客户端包。使用兼容的Node.js（项目支持20.19+或22.12+）；以下普通账号守护方案还需要`flock`和运行中的cron。

## 生成与首次验证

在开发机项目根目录执行：

```sh
npm run package:server
npm run package:client -- --server https://game.example.com
```

将示例域名替换成实际服务器地址。发布目录位于`release/`；Windows还会生成ZIP和SHA-256文件。校验上传包SHA-256后，将服务端包解压到新建的版本目录，保留`server/`和`shared/`的相对层级：

开发机空间不足时，可用 `MAGIC_RELEASE_DIR` 指定其他磁盘的发布目录；打包临时目录跟随进程 `TEMP`/`TMP`。这些选项不改变发布版本及签名校验。

```text
server/index.mjs
server/accounts.mjs
server/room.mjs
shared/                 # 规则与配置源码
deploy/
package.json
```

不需要`npm ci`、`npm run build`或`node_modules`。在包根目录首次前台验证：

```sh
KC_DATA_DIR="$HOME/magic-siege-data" HOST=127.0.0.1 PORT=5183 node server/index.mjs
```

另开终端检查`curl --fail http://127.0.0.1:5183/api/health`。返回包含`ok`、`protocolVersion`和`matchId`。访问根路径`/`返回404是预期行为，游戏页面由玩家本地客户端提供。前台验证结束后再安装下面的守护启动器，避免同时占用5183。

## 目录

```text
~/apps/magic-siege-skill5/
  releases/<版本>/       # server/、shared/、package.json和deploy/
  current -> releases/<版本>
  bin/run-user-service.sh
  shared/data/           # 持久化账号，与发布版本分开
  shared/logs/           # 运行日志
  shared/runtime/        # 进程锁和PID
```

此处根目录的`shared/data/`是运维数据目录，发布版本内的`shared/`是规则代码目录，两者分开。账号与阵营落盘；会话、战局、等级、体力、积分和临时房主配置仅在内存中，重启后重置。

首次可在独立应用目录中按以下顺序安装（`<版本>`替换成上传的版本文件夹名，目录不存在时才创建软链接）：

```sh
mkdir -p "$HOME/apps/magic-siege-skill5/bin" "$HOME/apps/magic-siege-skill5/releases" "$HOME/apps/magic-siege-skill5/shared/logs"
cd "$HOME/apps/magic-siege-skill5"
ln -s "releases/<版本>" current
cp current/deploy/run-user-service.sh bin/run-user-service.sh
chmod +x bin/run-user-service.sh
```

## 启动与恢复

将发布包内`deploy/run-user-service.sh`安装到上述`bin/`，赋予执行权限。脚本使用独占文件锁，重复运行不会开启第二个服务。默认监听`0.0.0.0:5183`，执行`server/index.mjs`。先用`command -v node`确认Node.js路径；脚本默认`/usr/bin/node`，路径不同可修改脚本默认值，或在手动启动与cron命令中同时设置`NODE_BIN`的绝对路径。

在保留账号原有其他定时任务的前提下，加入独立标记块（路径按实际账号调整）：

```cron
# BEGIN magic-siege-skill5
@reboot /home/colleague/apps/magic-siege-skill5/bin/run-user-service.sh >> /home/colleague/apps/magic-siege-skill5/shared/logs/supervisor.log 2>&1
* * * * * /home/colleague/apps/magic-siege-skill5/bin/run-user-service.sh >> /home/colleague/apps/magic-siege-skill5/shared/logs/supervisor.log 2>&1
# END magic-siege-skill5
```

安装后立即启动一次。后续开机由cron启动；进程退出后，在下一次分钟任务时恢复。部署工具需先验证`cron`正在运行，不能仅凭写入crontab宣称已开机启动。该方案不依赖用户systemd的linger或sudo。

```sh
nohup "$HOME/apps/magic-siege-skill5/bin/run-user-service.sh" </dev/null >/dev/null 2>&1 &
curl --fail http://127.0.0.1:5183/api/health
```

首次对外提供服务前，先在回环地址创建项目拥有者的首个游戏账号，避免其他访问者先取得房主。部署工具生成的账号凭据保存在操作者本机，禁止提交版本库或写入日志。

## 公网入口

独立端口需要服务器主机防火墙和云安全组允许TCP 5183。若直接端口不可达，可由管理员新增专用域名的Nginx站点代理到`127.0.0.1:5183`，SSE接口需关闭代理缓冲并设置长读取超时。普通账号不改写服务器已有站点。

SSE由Node.js默认协商流式Gzip，本地客户端代理透传编码和响应体；仍需保持下方 `proxy_buffering off`。无需为此修改客户端包或降低同步频率。回退时在启动服务的环境中设置 `MAGIC_SSE_GZIP=0`，重启服务生效；使用cron守护时也要在cron启动命令中保留该变量，避免下次拉起时恢复默认。

在已配置TLS的独立域名站点中使用以下代理配置：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5183;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
}
location / {
    return 404;
}
```

客户端配置的`serverUrl`填写该域名的HTTPS地址，不带`/api`。使用Nginx时可将服务监听设置为127.0.0.1，仅开放443。客户端本地代理会流式转发SSE，远端证书验证保持开启。

## 玩家分发与版本更新

玩家完整克隆或拉取 GitHub 仓库，双击仓库根目录的魔法王座.exe。无需安装 Node.js、npm 或执行构建。固定运行环境分片随 Git 拉取，首次启动在本机展开，后续复用。

客户端不自动下载或安装更新。版本不一致时禁止进入游戏，提示先退出游戏，在 GitHub Desktop 执行 Pull origin，再重新启动仓库入口。服务端不再分发完整客户端包，历史 `/api/updates/` 接口统一返回410。

## 客户端手动更新发布

main 是正式客户端的可运行入口。准备工作先在功能分支完成，以下流程必须在同一任务内连续执行；只合入/推送新客户端版本而未上线配套服务端，不算完成。发布期间只安排一个发布者，验收完成前不通知玩家拉取。完整要求见[三方版本同步规则](../docs/版本发布约定.md#main-可运行与三方同步2026-11-03补充)。

1. 遵守[统一版本约定](../docs/版本发布约定.md)，同步提升 SERVER_VERSION、CLIENT_VERSION 和 package/lockfile。
2. 构建桌面包，运行 `npm run package:repository -- <桌面包目录>`，提交源码、魔法王座.exe、desktop-client.json、client/prebuilt 和需要的运行环境分片。
3. 验证完整拉取后的仓库可直接启动，通过 PR 合入 GitHub 发布分支，再从该提交构建服务端包。取消客户端包签名与服务器上传步骤。
4. 备份账号并部署同版本服务端；服务端增量热更继续遵守[GitHub来源与战局约定](../docs/服务端热更.md)。保留战局更新后也需断开旧 SSE，让所有客户端重新通过版本检查。
5. 最后再次 fetch main，核对远端 protocol、package/lockfile、desktop-client.json、预构建客户端、实际启动版本，与正式服 `/api/version`、`/api/health` 中两端发布号全部一致。验证完整拉取 main 后可登录与同步 SSE，旧版被拦截，更新接口返回410且无客户端包下载；全部通过才报告完成。
6. main、正式服或基准摘要被其他任务推进时，先停止旧包激活，合入已发布提交、重新核对统一版本并制包。激活失败则继续恢复三方一致，或明确报告阻塞及当前不可用影响；不得只以“提交成功”结束本次发布。

`npm test` 验证发布版本校验；`npm run test:desktop` 验证桌面提示与无自动下载；浏览器版本限制测试覆盖启动、断线重连和窄屏。

## 运维检查

- 健康检查：`GET /api/health`。
- 运行日志：`shared/logs/server.log`；启动器错误：`shared/logs/supervisor.log`。
- 发布前校验上传包SHA-256，版本目录不覆盖已存在的发布。
- 停止服务前先移除本项目cron标记块，再向经过命令行及属主核对的本项目PID发送TERM；否则下一分钟会自动恢复。
- 更新或回滚前备份账号数据；切换`current`后重启并复查健康、通过本地客户端登录及SSE同步。不要将账号数据放入发布包。

## 版本探测与接口调用

`GET /api/version` 与 `/api/health` 公开返回两端发布号、战斗兼容版本和协议版本。游戏 API 要求 `X-Magic-Client-Version` 为客户端发布号、`X-Magic-Version` 为战斗兼容版本、`X-Magic-Protocol` 为协议版本。SSE 通过 releaseVersion、clientVersion（沿用历史名称，表示战斗版本）、protocolVersion 三个查询参数传递；参数与请求头同时存在时必须全部一致。任一版本缺失、落后或超前均返回409和 CLIENT_UPDATE_REQUIRED，提示手动拉取。版本查询始终可用，旧更新包接口返回410。

客户端打包检查 `client/dist/client-version.json` 的客户端发布版本、战斗兼容版本与协议标记是否对应源码，不匹配则重新构建。构建和打包不自动加版本；正式发布需手动同步提升 `SERVER_VERSION` 与 `CLIENT_VERSION`，兼容性变化才提升 `GAME_VERSION`。`RULESET_REVISION` 不参与检查。

桌面客户端默认自动连接 `http://124.222.216.66:5183`，不向玩家提供服务器设置入口，不读取旧个人地址或EXE旁的地址配置。2026-10-29已正式发布客户端/服务器0.5.2、战斗兼容0.5.0、协议3，客户端改为手动拉取，服务端 GitHub 只读校验与私有热更通道继续保留；部署验收见[0.5.2部署记录](../docs/releases/0.5.2-deployment-20261029.md)，后续当前版本以正式服接口为准。
