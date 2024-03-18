const { AsyncLocalStorage } = require("async_hooks");

const defaultStore = new Map();

const context = new AsyncLocalStorage();
context.enterWith(defaultStore)

const middleware = (req, res, next) => {
    context.run(new Map(), async () => {
        const apiKey = req.headers['x-api-key']
        const clientName = await helpers.FindClientByAPIKey(apiKey)
        context.getStore().set("clientName", clientName);
        next();
    });
  };

module.exports = {
    context,
    middleware
}



