const esp32Auth = (req, res, next) => {
  const key = req.headers['x-esp32-key'];
  if (!key || key !== process.env.ESP32_KEY) {
    return res.status(401).json({ message: 'Invalid ESP32 key' });
  }
  next();
};

module.exports = esp32Auth;
