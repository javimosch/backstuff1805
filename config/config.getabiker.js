module.exports = {
    models: (create) => {
        //create('Stats', {});
        //create('UserNotifications', require('../schemas/schema.user-notifications').def);
        //create('StripeTransaction', require('../schemas/schema.diags-stripe-transaction').def);
        //create('Balance', require('../schemas/schema.balance').def);
        //create('BalanceItem', require('../schemas/schema.balance-item').def);
        //create('TimeRange', require('../schemas/schema.time-range').def);
        create('User', require('../schemas/schema.gab-user').def);
        create('Order', require('../schemas/schema.gab-order').def);
    },
    controllers: (ctrl) => {
        ctrl.path('User', 'gabuser');
        ctrl.path('Order', 'gaborder');
        
        ctrl.create('User');
        
    }
}