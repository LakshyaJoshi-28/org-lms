const responseCache = new Map();
const DEFAULT_SERVER_TTL = 10000; // 10 seconds server-side memory TTL

const cacheMiddleware = (duration = DEFAULT_SERVER_TTL) => {
  return (req, res, next) => {
    if (req.method !== 'GET' || !req.user) {
      return next();
    }

    const orgId = String(req.user.organizationId?.id || req.user.organizationId?._id || req.user.organizationId || 'public');
    const userId = String(req.user.id || req.user._id || 'guest');
    const role = String(req.user.role || 'none');
    const key = `${orgId}:${userId}:${role}:${req.originalUrl || req.url}`;

    const cached = responseCache.get(key);
    if (cached && (Date.now() - cached.timestamp < duration)) {
      res.setHeader('X-Server-Cache', 'HIT');
      return res.status(cached.status).json(cached.body);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        responseCache.set(key, {
          timestamp: Date.now(),
          status: res.statusCode,
          body
        });
      }
      return originalJson(body);
    };

    next();
  };
};

const invalidateServerCache = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const url = req.originalUrl || req.url || '';
    if (!url.includes('/notifications') && !url.includes('/progress')) {
      responseCache.clear();
    }
  }
  next();
};

module.exports = {
  cacheMiddleware,
  invalidateServerCache
};
