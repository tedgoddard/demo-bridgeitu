window.documentService = 'http://dev.bridgeit.io/docs/bridgeit.u/documents';
window.authService = 'http://dev.bridgeit.io/auth/bridgeit.u/token/local';
window.pushUri = 'http://dev.bridgeit.io/push';
// Used to store event id/name to easily reference the name String to avoid encoding/decoding the String in javascript
window.events = {};

function loginSubmit(isAdmin){
    return function(event){
        event.preventDefault();
        /* form element used to generically validate form elements (could also serialize the form if necessary)
        *  Also using form to create post data from form's elements
        */
        var form = this;
        if(validate(form)){
            // Avoid getting a token from anonymous credentials
            if((isAdmin === undefined) && (form.userName.value === 'anonymous' && form.passWord.value === 'anonymous')){
                loginErrorAlert('Invalid Credentials');
                return;
            }
            var postData = {'username' : form.userName.value,
                            'password' : form.passWord.value};
            $.ajax({
                url : window.authService,
                type: 'POST',
                dataType : 'json',
                contentType: 'application/json; charset=utf-8',
                data : JSON.stringify(postData)
            })
            .fail(loginFail)
            .done(isAdmin ? adminLoginDone : studentLoginDone);
        }else{
            //Form fields are invalid, remove any alerts related to authentication
            $('#alertLoginDiv').html('');
        }
    };
}

function logoutClick(isAdmin){
    return function(event){
        event.preventDefault();
        if(isAdmin){
            adminLogout();
        }else{
            studentLogout();
        }
    };
}

function loginFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status === 401){
        // 401 unauthorized
        loginErrorAlert('Invalid Credentials');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function registerPushUsernameGroup(username, token){
    bridgeit.usePushService(window.pushUri, null, {auth:{access_token: token}});
    if ("anonymous" == username) {
        bridgeit.addPushListener(username, 'handleAnonPush');
    } else {
        bridgeit.addPushListener(username, 'handlePush');
    }
}

function handleAnonPush(){
    console.log('BridgeIt U Anonymous Push Callback');
    retrieveEvents();
    // Push called when student Changes Location, retrieve updated user record
    if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
        updateStudent();
    }
    getNotifications("anonymous", function (data) {
        data.forEach(displayNotification);
    });
}

function handlePush(){
    console.log('BridgeIt U Push Callback');
    retrieveEvents();
    // Push called when student Changes Location, retrieve updated user record
    if(tokenValid(localStorage.bridgeitUToken, localStorage.bridgeitUTokenExpires)){
        updateStudent();
    }
    getNotifications(localStorage.bridgeitUUsername, function (data) {
        data.forEach(displayNotification);
    });
}

function handlePushRegistration(event)  {
    console.log('handlePushRegistration() called, registered=' + bridgeit.isRegistered());
    if (bridgeit.isRegistered())  {
        //document.getElementById('regBtn').style.display = 'none';
    }
}

function getNotifications(username, callback)  {
    var now = new Date();
    var query = {
        type: "notification",
        username: username,
        expiry: { $gt: now.getTime() }
    };
    $.getJSON(window.documentService +
            '?query=' + JSON.stringify(query) +
            '&access_token=' + (localStorage.bridgeitUToken ? localStorage.bridgeitUToken : localStorage.bridgeitUAnonymousToken))
    .done(callback);
}

var notifications = {};

function displayNotification(item)  {
    //could also clean up based on expiry
    if (notifications[item.timestamp])  {
        return;
    }
    notifications[item.timestamp] = item;
    infoAlert('<strong>' + item.pushSubject + '</strong>');
}

function retrieveEventsFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status === 404){
        // 404 means the list is empty
        $('#evntLst').html('');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

var requestServiceFail = function (service){
    return function(jqxhr, textStatus, errorThrown){
        errorAlert('<strong>Error connecting to ' + service + '</strong>: status <strong>' + jqxhr.status + '</strong> - please try again later.');
    };
}

function requestFail(jqxhr, textStatus, errorThrown){
    errorAlert('<strong>Error connecting to the service</strong>: status <strong>' + jqxhr.status + '</strong> - please try again later.');
}

function serviceRequestUnexpectedStatusAlert(source, status){
    warningAlert('<strong>' + source + ' Warning</strong>: Unexpected status <strong>' + status + '</strong> returned.');
}

function validate(form){
    /* Create and Edit forms have name and details fields.  Instead of
     * referencing by id, validate form children to avoid duplicate id's.
     */
    var formValid = true;
    for(var i=0; i<form.length; i++){
        if( (form[i].tagName === 'INPUT' || form[i].tagName === 'TEXTAREA')
                && form[i].value === ''){
            $(form[i]).parent('div').addClass('has-error');
            formValid = false;
        }else{
            $(form[i]).parent('div').removeClass('has-error');
        }
    }
    return formValid;
}

function confirmPassword(password, confirm){
    if(password === confirm){
        return true;
    }else{
        registerErrorAlert('Passwords do not match.');
        return false;
    }
}

function uiLoggedIn(username){
    $('#welcome').html('Welcome: ' + username);
    showLogoutNavbar();
    resetLoginBody();
    $('#loginModal').modal('hide');
    // clear previous user notices
    removeNoticesInfoClass();
    $('#alertDiv').html('');
}

function resetLoginBody(){
    resetForm('loginModalForm');
    $('#alertLoginDiv').html('');
}

function resetForm(formId){
    var formToReset = document.getElementById(formId);
    formToReset.reset();
    resetFormCSS(formToReset);
}

function resetFormCSS(form){
    for(var i=0; i<form.length; i++){
        if(form[i].tagName === 'INPUT' || form[i].tagName === 'TEXTAREA'){
            $(form[i]).parent('div').removeClass('has-error');
        }
    }
}

function showLoginNavbar(){
    $('#loginNavbar').show();
    $('#logoutNavbar').hide();
}

function showLogoutNavbar(){
    $('#loginNavbar').hide();
    $('#logoutNavbar').show();
}

function addNoticesInfoClass(){
    $('#noticesPanel').addClass('panel-info');
}

function removeNoticesInfoClass(){
    $('#noticesPanel').removeClass('panel-info');
}

function tokenValid(token, expires, type){
    return (token !== undefined) && (parseInt(expires) > new Date().getTime());
}

function infoAlert(message){
    $('#alertDiv').prepend(
        $('<div class="alert alert-info fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
    // Popup for student page so student doesn't have to scroll to notices panel
    $('#noticeDiv').html('<div class="alert alert-info"><small>' + message + '</small></div>');
    $('#noticeModal').modal('show');
}

function warningAlert(message){
    $('#alertDiv').prepend(
        $('<div class="alert alert-warning fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function successAlert(message){
    $('#alertDiv').prepend(
        $('<div class="alert alert-success fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function errorAlert(message){
    $('#alertDiv').prepend(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" onclick="removeNoticesInfoClass();" aria-hidden="true">&times;</button><small>' + message + '</small></div>').hide().fadeIn('slow')
    );
    addNoticesInfoClass();
}

function loginErrorAlert(message){
    $('#alertLoginDiv').html(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' + message + '</div>').hide().fadeIn('fast')
    );
}

function registerErrorAlert(message){
    $('#alertRegisterDiv').html(
        $('<div class="alert alert-danger fade in"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' + message + '</div>').hide().fadeIn('fast')
    );
}
