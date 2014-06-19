window.authServicePermissions = 'http://dev.bridgeit.io/auth/bridgeit.u/token/permissions';
window.anonymousNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/anonymousNotification';
window.studentNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/studentNotification';
window.noTicketOnCampusNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/noTicketOnCampusNotification';
window.ticketHolderNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/ticketHolderNotification';
window.residenceNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/residenceNotification';
window.onCampusNotificationFlow = 'http://dev.bridgeit.io/code/bridgeit.u/onCampusNotification';
window.flowLookupObject = {1 : window.anonymousNotificationFlow,
                           2 : window.studentNotificationFlow,
                           3 : window.noTicketOnCampusNotificationFlow,
                           4 : window.ticketHolderNotificationFlow,
                           5 : window.residenceNotificationFlow,
                           6 : window.onCampusNotificationFlow,
                           7 : window.studentNotificationFlow};

function adminLoginDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        // Check that user has admin permissions
        var postData = {};
        postData['access_token'] = data.access_token;
        postData['permissions'] = 'u.admin';
        $.ajax({
            url : window.authServicePermissions,
            type: 'POST',
            dataType : 'json',
            contentType: 'application/json; charset=utf-8',
            data : JSON.stringify(postData)
        })
        .fail(adminPermissionFail)
        .done(adminPermissionDone(data.access_token, data.expires_in));
    }else{
        serviceRequestUnexpectedStatusAlert('Login', jqxhr.status);
    }
}

var adminPermissionDone = function(token, expires_in){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 200){
            sessionStorage.bridgeitUToken = token;
            sessionStorage.bridgeitUTokenExpires = expires_in;
            sessionStorage.bridgeitUUsername = $('#userName').val();
            registerPushUsernameGroup(sessionStorage.bridgeitUUsername);
            adminLoggedIn();
        }else{
            serviceRequestUnexpectedStatusAlert('Permission Check', jqxhr.status);
        }
    }
};

function adminPermissionFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        loginErrorAlert('Invalid Login - you are not an administrator');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function adminLoggedIn(){
    uiLoggedIn(sessionStorage.bridgeitUUsername);
    // Admin screen has login cancel buttons hidden to force login.  After logging in as admin show cancel buttons.
    $('#loginCloseBttn').show();
    $('#loginCancelBttn').show();
    retrieveEventsAdmin();
    $('#crtEvntFrm')[0].reset();
}

function adminLogout(expired){
    sessionStorage.removeItem('bridgeitUToken');
    sessionStorage.removeItem('bridgeitUTokenExpires');
    sessionStorage.removeItem('bridgeitUUsername');
    toggleCreateNotifyEvent();
    showLoginNavbar();
    $('#welcome').html('');
    // Force login by showing modal login and initially hide close and cancel buttons
    $('#loginModal').modal('show');
    $('#loginCloseBttn').hide();
    $('#loginCancelBttn').hide();
    if(expired){
        loginErrorAlert('Session Expired');
    }
}

function retrieveEventsAdmin(){
    if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
        $.getJSON(window.documentService + '?access_token=' + sessionStorage.bridgeitUToken)
        .fail(retrieveEventsFail)
        .done(adminRetrieveEventsDone);
    }else{
        adminLogout('expired');
    }
}

function adminRetrieveEventsDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        var evntLstDiv = $('#evntLst');
        evntLstDiv.html('');
        $.each(data, function(i, obj) {
            // Using Document Service to store users, this will skip the user documents
            if(!obj.type){
                // Store the name Strings in the page to avoid encoding/decoding Strings coming from the service that may be used in javascript methods
                window.events[obj._id] = obj.name;
                evntLstDiv.append('<div class="list-group-item"><a title="Send Event Notification" data-toggle="modal" href="#evntNtfctnModal" onclick="notifyEvent(\'' + obj._id + '\');"><span style="margin-right: 10px;" class="glyphicon glyphicon-bullhorn"></span></a>' + obj.name + '<a title="Delete Event" onclick="deleteEvent(\'' + obj._id + '\');" class="pull-right"><span style="margin-left: 10px;" class="glyphicon glyphicon-remove-circle"></span></a><a title="Edit Event" data-toggle="modal" href="#editModal" onclick="editEvent(\'' + obj._id + '\');" class="pull-right"><span class="glyphicon glyphicon-edit"></span></a></div>');
            }
        });
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Events', jqxhr.status);
    }
}

function createEventSubmit(){
    $('#crtEvntFrm').submit(function( event ) {
        event.preventDefault();
        if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json Post data from form's elements
            */
            var form = this;
            if(validate(form)){
                var postData = {};
                postData['name'] = form.crtname.value;
                postData['details'] = form.crtdetails.value;
                $.ajax({
                    url : window.documentService + '?access_token=' + sessionStorage.bridgeitUToken,
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(requestFail)
                .done(createEventDone(form.crtname.value));
            }
        }else{
            adminLogout('expired');
        }
    });
}

var createEventDone = function(name){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 201){
            successAlert('<strong>' + name + '</strong> Event Created');
            $('#crtEvntFrm')[0].reset();
            retrieveEventsAdmin();
            notifyCRUDEvent();
        }else{
            serviceRequestUnexpectedStatusAlert('Create Event', jqxhr.status);
        }
    };
};

function editEvent(documentId){
    if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
        $.getJSON( window.documentService + '/' + documentId + '?access_token=' + sessionStorage.bridgeitUToken + '&results=one')
        .fail(requestFail)
        .done(editGetEventDone);
    }else{
        adminLogout('expired');
    }
}

function editGetEventDone(data, textStatus, jqxhr){
    if( jqxhr.status == 200){
        document.getElementById('edtName').value = data.name;
        document.getElementById('edtDetails').value = data.details;
        $('#edtEvntFrm').off('submit').on('submit',(function( event ) {
            event.preventDefault();
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json Put data from form's elements
            */
            var form = this;
            if(validate(form)){
                var putData = {};
                putData['name'] = form.edtName.value;
                putData['details'] = form.edtDetails.value;
                $.ajax({
                    url : window.documentService + '/' + data._id + '?access_token=' + sessionStorage.bridgeitUToken,
                    type: 'PUT',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(putData)
                })
                .fail(requestFail)
                .done(editEventDone(data._id));
            }
        }));
    }else{
        serviceRequestUnexpectedStatusAlert('Retrieve Event', jqxhr.status);
    }
}

var editEventDone = function(documentId){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 201){
            successAlert('<strong>' + window.events[documentId] + '</strong> Event Edited');
            $('#editModal').modal('hide');
            retrieveEventsAdmin();
            notifyCRUDEvent();
        }else{
            serviceRequestUnexpectedStatusAlert('Edit Event', jqxhr.status);
        }
    };
};

function deleteEvent(documentId){
    if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
        if (confirm("Delete Event?")){
            $.ajax({
                url : window.documentService + '/' + documentId +  '?access_token=' + sessionStorage.bridgeitUToken,
                type: 'DELETE',
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
            })
            .fail(requestFail)
            .done(deleteDone(documentId));
        }
    }else{
        adminLogout('expired');
    }
}

var deleteDone = function(documentId){
    return function(data, textStatus, jqxhr){
        if(jqxhr.status == 204){
            successAlert('<strong>' + window.events[documentId] + '</strong> Event Deleted');
            retrieveEventsAdmin();
            notifyCRUDEvent();
        }else{
            serviceRequestUnexpectedStatusAlert('Delete Event', jqxhr.status);
        }
    };
};

function notifyCRUDEvent(){
    var postData = {};
    postData['access_token'] = sessionStorage.bridgeitUToken;
    postData['pushSubject'] = 'Event List Modified';
    $.ajax({
        url : window.anonymousNotificationFlow,
        type: 'POST',
        dataType : 'json',
        contentType: 'application/json; charset=utf-8',
        data : JSON.stringify(postData)
    })
    .fail(notifyCRUDEventFail)
    .done(notifyCRUDEventDone);
}

function notifyEvent(documentId){
    $('#ntfctnTextLabel').html(window.events[documentId]);
    notifyEventShow();
    $('#evntNtfctnFrm').off('submit').on('submit',(function( event ) {
        event.preventDefault();
        if(tokenValid(sessionStorage.bridgeitUToken, sessionStorage.bridgeitUTokenExpires)){
            /* form element used to generically validate form elements (could also serialize the form if necessary)
            *  Also using form to create json post data from form's elements
            */
            var form = this;
            var eventName = window.events[documentId];
            var pushSubject = form.ntfctnText.value;
            storeNotification(eventName, pushSubject, 20);

            if(validate(form)){
                var postData = {};
                postData['access_token'] = sessionStorage.bridgeitUToken;
                postData['eventName'] = eventName;
                postData['pushSubject'] = pushSubject;
                $.ajax({
                    url : window.flowLookupObject[form.ntfctnSlct.value],
                    type: 'POST',
                    dataType : 'json',
                    contentType: 'application/json; charset=utf-8',
                    data : JSON.stringify(postData)
                })
                .fail(notifyCRUDEventFail)
                .done(notifyCRUDEventDone);
            }
        }else{
            adminLogout('expired');
        }
    }));
}

function storeNotification(eventName, pushSubject, lifeseconds)  {
    var notification = {};
    var now = new Date();
    notification.type = "notification";
    notification.timestamp = now.getTime();
    notification.expiry = now.getTime() + (lifeseconds * 1000);
    notification.eventName = eventName;
    notification.pushSubject = pushSubject;
    $.ajax({
        url : window.documentService + '/' + '?access_token=' +
                sessionStorage.bridgeitUToken,
        type: 'POST',
        dataType : 'json',
        contentType: 'application/json; charset=utf-8',
        data : JSON.stringify(notification)
    })
    .fail(requestFail);
}

function notifyCRUDEventFail(jqxhr, textStatus, errorThrown){
    if(jqxhr.status == 401){
        // 401 unauthorized
        errorAlert('<strong>Unauthorized</strong> to send event CRUD notifications: status <strong>' + jqxhr.status + '</strong>');
    }else{
        requestFail(jqxhr, textStatus, errorThrown);
    }
}

function notifyCRUDEventDone(data, textStatus, jqxhr){
    if(jqxhr.status == 200){
        infoAlert('<strong>' + data.pushSubject + '</strong> push group notified.');
        toggleCreateNotifyEvent();
    }else{
        serviceRequestUnexpectedStatusAlert('Purchase', jqxhr.status);
    }
}

function notifyEventShow(){
    document.getElementById('evntNtfctnFrm').reset();
    $('#crtEvntDiv').hide();
    $('#evntNtfctnDiv').show('slow');
}

function toggleCreateNotifyEvent(){
    $('#evntNtfctnDiv').hide();
    $('#crtEvntDiv').show('slow');
}