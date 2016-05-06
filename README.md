diags-back

### enviroments variables to configure:

- process.env.stripeSecretToken (secure stripe token to operate with stripe framework)
- process.env.companyName 
- process.env.dbURI (mongodb connection. Ex: mongodb://root:root@myMongoLab.mongolab.com:59165/dbName )
- process.env.adminURL (The front exposed url. For email links to the back-office. The anchor in the end is very important Ex: https://diagnostical.com/admin# ) 
- process.env.disableMailing (Optional)
- process.env.PORT (Port where the back server will be exposed)


