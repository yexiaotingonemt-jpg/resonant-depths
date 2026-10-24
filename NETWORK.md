# 联网双人

前端：[GitHub Pages](https://yexiaotingonemt-jpg.github.io/resonant-depths/)。房间中继：`wss://resonant-rooms.yexiaoting-onemt.workers.dev`。健康检查：[health](https://resonant-rooms.yexiaoting-onemt.workers.dev/health)。

## 同步方式

房主浏览器以固定 60 Hz 更新权威 `World`，每秒向搭档发送约 20 份快照。搭档每秒约 30 次发送自己的输入，按实体 ID 插值显示世界。输入序号和阶段标识阻止旧包重复释放技能或重复选择遗物；350 ms 无新输入即停止移动。共享救援、血量、合击、掉落、遗物、路线和结算均在房主计算。1.3 版使用游戏协议 4，同步灵印、破口、嘲讽、锁魂目标/倒计时、护盾、双方合击确认窗口，以及契约、遗物等级、重铸次数和流派临时状态。重铸会更新选项版本号，迟到的旧选择不会误选新卡；同一奖励阶段内，双方界面也会随重铸更新。旧版本加入时会提示双方刷新；中继传输接口保持兼容，无需改变房间地址。

`src/net/session.ts` 管理房间、准备、同步、暂停和重连；`protocol.ts` 校验输入/快照并管理权威更新；`relay.ts` 通过原生 WebSocket 连接房间服务。没有摄像头或麦克风权限，也不依赖公共 STUN/TURN 服务。

`server/worker.mjs` 使用 Cloudflare Workers 与 SQLite Durable Objects 的 WebSocket Hibernation API。每个 8 位房间码对应一个对象，只有房主和搭档两个连接。中继只转发允许的消息类型，并限制来源、消息大小及速率；不保存账号、聊天或游戏存档。房间码代表加入权限，请仅分享给搭档。房主浏览器还会保留原搭档的会话标识，支持同一标签刷新后重新加入。

8 秒没有对端心跳会暂停。搭档离开时房主保留这一局并等待原搭档；房主关闭页面时房间结束。服务器发布或网络中断可能使现有连接断开；本版本不迁移房主，也不在服务端恢复房主的存档。

## 开发与发布

前端仍由仓库的 GitHub Actions 自动部署至 Pages。中继源代码、部署配置和测试随仓库版本管理；部署后端需要 Cloudflare 账号的 Workers 写入权限：

```powershell
npm ci
npm run server:dev
# 另一终端
$env:VITE_RELAY_URL='ws://127.0.0.1:8787'
npm run dev -- --port 5178
# 第三终端
npm run test:online
npm run test:art
```

开发服务不设置 `VITE_RELAY_URL` 时，会使用已部署的公网中继，因此也可直接回归真实 WSS 连接。该变量是公开服务地址，不是密钥。不要将本地 `ws://` 地址构建到生产站点。

```powershell
npx wrangler login
npm run server:deploy
```

`server/wrangler.jsonc` 声明 Durable Object 和初始 SQLite migration。迁移标签应保留，避免重新创建现有绑定。新部署账号需同步更新前端默认中继 URL；更换前端域名还需更新 `server/policy.mjs` 的允许来源。后端账号凭据不应加入仓库。服务使用账号现有 Workers 配额；未自动购买任何付费套餐。

后端使用官方 [WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/)。
