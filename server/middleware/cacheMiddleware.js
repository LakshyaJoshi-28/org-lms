const responseCache = new Map();
const DEFAULT_SERVER_TTL = 3000; // 3 seconds server-side memory TTL

const cacheMiddleware = (duration = DEFAULT_SERVER_TTL) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const orgId = req.user?.organizationId
      ? String(req.user.organizationId.id || req.user.organizationId._id || req.user.organizationId)
      : 'public';
    const userId = req.user?.id ? String(req.user.id || req.user._id) : 'guest';
    const key = `${orgId}:${userId}:${req.originalUrl || req.url}`;

    const cached = responseCache.get(key);
    if (cached && (Date.now() - cached.timestamp < duration)) {
      res.setHeader('X-Cache', 'HIT');
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
    responseCache.clear();
  }
  next();
};

module.exports = {
  cacheMiddleware,
  invalidateServerCache
};
