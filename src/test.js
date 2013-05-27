
var User = function(user) {
    for (var prop in user) {
        this[prop] = user[prop];
    }
};

var Account = {
    isExpires: function(user) {
        var expires = user.expires;
        if (expires <= 0) {
            return true;
        }
        return false;
    },

    getUser: function(){
        var user = localStorage.getItem('userInfo');
        if(user){
            user = JSON.parse(user);
            if(Account.isExpires(user)){
                user = null;
            }
        }else{
            user = null;
        }
        return user;
    },

    addUser: function(user){
        localStorage.setItem('userInfo', JSON.stringify(user));
    },

    removeUser: function(){
        localStorage.setItem('userInfo', '');
    }

}


