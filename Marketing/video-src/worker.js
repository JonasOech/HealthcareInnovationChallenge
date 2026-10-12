// Serves the built deck (dist/) and runs the live session at /live: while the presenter has the deck open,
// everyone else follows along and can go back but not further than the presenter's slide.
// One Durable Object ("Live") holds the presenter's slide and fans it out to every viewer over WebSockets.
// Without a presenter connected nothing is locked, so the deck is freely browsable before and after the talk.
import { DurableObject } from 'cloudflare:workers';

const GRACE_MS = 45_000;   // a presenter who drops (reload, flaky Wi-Fi) has this long to reconnect before viewers unlock

export default {
  async fetch(req, env) {
    if (new URL(req.url).pathname === '/live') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      return env.LIVE.get(env.LIVE.idFromName('deck')).fetch(req);
    }
    return env.ASSETS.fetch(req);
  },
};

export class Live extends DurableObject {
  async fetch(req) {
    const q = new URL(req.url).searchParams;
    const admin = await isPresenterKey(q.get('key'), this.env.PRESENTER_KEY);
    const { 0: client, 1: ws } = new WebSocketPair();
    this.ctx.acceptWebSocket(ws, [admin ? 'admin' : 'viewer']);
    ws.serializeAttachment({ admin, ended: false });

    let { live, idx } = await this.state();
    if (admin) {
      await this.ctx.storage.deleteAlarm();
      idx = slide(q.get('idx'), idx);
      await this.ctx.storage.put('idx', idx);
      if (!live) await this.setLive(true);
      else this.broadcast('viewer', { type: 'jump', idx });
      live = true;
    }
    ws.send(JSON.stringify({ type: 'hello', admin, live, idx }));
    this.sendCount();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    if (!ws.deserializeAttachment()?.admin) return;   // viewers only listen
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'jump') {
      const idx = slide(m.idx, 0);
      await this.ctx.storage.put('idx', idx);
      this.broadcast('viewer', { type: 'jump', idx });
    } else if (m.type === 'play') {
      const from = slide(m.from, 0), to = slide(m.to, from);
      await this.ctx.storage.put('idx', to);
      this.broadcast('viewer', { type: 'play', from, to });
    } else if (m.type === 'end') {
      // the presenter ended the session: unlock now, and tell every presenter window to stay disconnected
      for (const s of this.ctx.getWebSockets('admin')) {
        s.serializeAttachment({ admin: true, ended: true });
        try { s.send(JSON.stringify({ type: 'ended' })); s.close(4000, 'ended'); } catch {}
      }
      await this.ctx.storage.deleteAlarm();
      await this.setLive(false);
    }
  }

  async webSocketClose(ws) { await this.gone(ws); try { ws.close(1000); } catch {} }
  async webSocketError(ws) { await this.gone(ws); }

  async gone(ws) {
    const { admin, ended } = ws.deserializeAttachment() ?? {};
    this.sendCount(ws);
    if (!admin || this.ctx.getWebSockets('admin').some(s => s !== ws)) return;
    if (ended) await this.setLive(false);
    else await this.ctx.storage.setAlarm(Date.now() + GRACE_MS);
  }

  async alarm() {
    if (this.ctx.getWebSockets('admin').length === 0) await this.setLive(false);
  }

  async state() {
    const s = await this.ctx.storage.get(['live', 'idx']);
    return { live: s.get('live') ?? false, idx: s.get('idx') ?? 0 };
  }

  async setLive(on) {
    const { live, idx } = await this.state();
    if (live === on) return;
    await this.ctx.storage.put('live', on);
    this.broadcast(null, { type: 'live', on, idx });
  }

  broadcast(tag, m) {
    const msg = JSON.stringify(m);
    for (const s of tag ? this.ctx.getWebSockets(tag) : this.ctx.getWebSockets()) try { s.send(msg); } catch {}
  }

  // the presenter's badge shows how many people are watching
  sendCount(leaving) {
    const n = this.ctx.getWebSockets('viewer').filter(s => s !== leaving).length;
    for (const s of this.ctx.getWebSockets('admin')) if (s !== leaving) try { s.send(JSON.stringify({ type: 'count', n })); } catch {}
  }
}

const slide = (v, fallback) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n < 1000 ? n : fallback; };

// constant-time comparison of the given key with the PRESENTER_KEY secret
async function isPresenterKey(key, secret) {
  if (!key || !secret) return false;
  const hash = async s => crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return crypto.subtle.timingSafeEqual(await hash(key), await hash(secret));
}
