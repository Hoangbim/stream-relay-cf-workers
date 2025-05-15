edit code and run ./deploy.sh
connect to worker with:

```
wss://cloudflare-worker-project.nvhoangwru.workers.dev/stream/:stream_id
```

front end domain name must be same with media-server domain name

example:
frontend domain
https://video.bandia.vn/static/player.html call wss://cloudflare-worker-project.nvhoangwru.workers.dev/stream/:stream_id

-> worker will relay from media publish server: wss://video.bandia.vn/:stream_id

frontend domain
https://video.ermis.network/static/player.html call wss://cloudflare-worker-project.nvhoangwru.workers.dev/stream/:stream_id

-> worker will relay from media publish server: wss://video.ermis.network/:stream_id
first packet from media (codec description) publish server will store in worker and worker send it in first message when client connect
