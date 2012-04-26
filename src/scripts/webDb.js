/*
 * Copyright 2011 Research In Motion Limited.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var db;

/*
    Note:On some BlackBerry Smartphones, a SDCard is required to run this sample.  This is due to the fact that SQLite databases depend on the file system structure provided by Flash memory.


    Rules of HTML5 Database:

        1. The transaction(), readTransaction(), and changeVersion() methods invoke callbacks with a SQLTransaction object as an argument.

        2. The executeSql() method invokes its callback with two arguments: SQLTransaction and SQLResultSet.

        3. When an error occurs within the executeSql() method, its error callback is invoked with a SQLError object as an argument.
*/

/**
 * Helper functions
 */
function error(msg) {
    var ele = document.getElementById("output");
    if (ele) {
        ele.innerHTML += "<div class='error'>" + msg + "</div>" ;
    }
}
function getSQLErrorName(err) {
    if (err === null)  {
        return "";
    }
    switch(err.code) {
        case err.DATABASE_ERR:
            //The statement failed for database reasons not covered by any other error code.
            return "DATABASE";
        case err.VERSION_ERR:
            //The operation failed because the actual database version was not what it should be.
            //  For example, a statement found that the actual database version no longer matched the
            //  expected version of the Database or DatabaseSync object, or the Database.changeVersion()
            //  or DatabaseSync.changeVersion() methods were passed a version that doesn't match the actual database version.
            return "DATABASE VERSION";
        case err.TOO_LARGE_ERR:
            //The statement failed because the data returned from the database was too large. The
            //  SQL "LIMIT" modifier might be useful to reduce the size of the result set.
            return "RESULT TOO LARGE";
        case err.QUOTA_ERR:
            //The statement failed because there was not enough remaining storage space, or the storage
            //  quota was reached and the user declined to give more space to the database.
            return "QUOTA EXCEEDED";
        case err.SYNTAX_ERR:
            //The statement failed because of a syntax error, or the number of arguments did not match
            //  the number of ? placeholders in the statement, or the statement tried to use a statement
            //  that is not allowed, such as BEGIN, COMMIT, or ROLLBACK, or the statement tried to use a
            //  verb that could modify the database but the transaction was read-only.
            return "SYNTAX";
        case err.CONSTRAINT_ERR:
            //An INSERT, UPDATE, or REPLACE statement failed due to a constraint failure. For example,
            //  because a row was being inserted and the value given for the primary key column duplicated
            //  the value of an existing row.
            return "CONSTRAINT";
        case err.TIMEOUT_ERR:
            //A lock for the transaction could not be obtained in a reasonable ti
            return "TIMEOUT";
        default:
            //The transaction failed for reasons unrelated to the database itself and not covered by any
            //  other error code.
            return "UNKNOWN";
    }
}

//Two types of error events can occur: transaction errors and SQL statement errors.

/**
 * SQLTransactionErrorCallback - method raised by the db.transaction() or db.readTransaction() or db.changeVersion() methods when an error occurs within a transaction event.
 *      http://www.w3.org/TR/webdatabase/#sqltransactionerrorcallback
 * @param err (SQLError) has two parameters: code (unsigned short), message (string) and constants
 *      http://www.w3.org/TR/webdatabase/#sqlerror
 */
function handleTransactionError(err) {
    alert("SQLTransactionError " + err.code + " [" + getSQLErrorName(err.code) + "] " + err.message);
}
/**
 * SQLStatementErrorCallback - method raised by the tx.executeSql() method when an error occurs within an SQL statement.
 *      http://www.w3.org/TR/webdatabase/#sqlstatementerrorcallback
 * @param tx (SQLTransaction) has a single method: void executeSql(string sqlStatement, optional array args, optional SQLStatementCallBack callback, optional SQLStatementErrorCallback errorCallback)
 *      http://www.w3.org/TR/webdatabase/#sqltransaction
 * @param err (SQLError) has two parameters: code (unsigned short), message (string) and constants
 *      http://www.w3.org/TR/webdatabase/#sqlerror
 */
function handleSQLError(tx, err) {
    //The tx parameter can be used to run another SQL statement (e.g. log a message to an error table)
    alert("SQLStatementError " + err.code + " [" + getSQLErrorName(err.code) + "] " + err.message);
}



/**
 * The following are SQLStatementCallback methods raised after a records are inserted, updated, deleted selected from the DB.
 * @param tx (SQLTransaction) has a single method: void executeSql(string sqlStatement, optional array args, optional SQLStatementCallBack callback, optional SQLStatementErrorCallback errorCallback)
 *      http://www.w3.org/TR/webdatabase/#sqltransaction
 * @param result (SQLResultSet) contains three attributes: insertId (readonly long), rowsAffected (readonly long), rows (readonly SQLREsultSetRowList)
 *      http://www.w3.org/TR/webdatabase/#sqlresultset
 */
function insertComplete(tx, result) {
    //The insertId attribute contains the ID of the row that was inserted into the database.
    //If a single statement inserted multiple rows, the ID of the last row is returned.
    debug.log("insertComplete", result.rowsAffected + " row(s) added (rowId =" + result.insertId + ")", debug.info);
}
function updateComplete(tx, result) {
    //The rowsAffected attribute contains number of rows that were changed by the SQL statement.
    // SELECT statements do not modify rows, and therefore have a rowsAffected value of 0.
    debug.log("updateComplete", result.rowsAffected + " row(s) updated", debug.info);
}
function deleteComplete(tx, result) {
    debug.log("deleteComplete", result.rowsAffected + " row(s) deleted", debug.info);
}
function selectComplete(tx, result) {
    //The rows attribute is a SQLResultSetRowList object containing one paramter length (int) and one method .item(index)
    //  The same object must be returned each time. If no rows were returned, then the object will be empty (its length will be zero).
    //  http://www.w3.org/TR/webdatabase/#sqlresultsetrowlist
    var size = result.rows.length;
    debug.log("selectComplete", size + " row(s) returned", debug.info);
}




/**
 * SQLStatementCallback methods raised after a SELECT statement is called.  Display results to the page.
 * @param tx (SQLTransaction) has a single method: void executeSql(string sqlStatement, optional array args, optional SQLStatementCallBack callback, optional SQLStatementErrorCallback errorCallback)
 *          http://www.w3.org/TR/webdatabase/#sqltransaction
 * @param result (SQLResultSet) contains three attributes: insertId (readonly long), rowsAffected (readonly long), rows (readonly SQLREsultSetRowList)
 *          http://www.w3.org/TR/webdatabase/#sqlresultset
 */
function displayMessagesResults(tx, result) {
    var ele, output, size, i, item, dt;

    ele = $("#todo-list");
    output = "";
    size = result.rows.length;

    if (size === 0) {
        output += "<li>Click the add button to enter a task.</li>";
    }
    else {
        for (i = 0; i < size; i = i + 1) {
            item = result.rows.item(i);
            output += '<li onclick="track(' + item.id + ');" data-corners="false" data-shadow="false" data-iconshadow="true" data-wrapperels="div" data-icon="arrow-r" data-iconpos="right" data-theme="c" class="ui-btn ui-btn-up-c ui-btn-icon-right ui-li-has-arrow ui-li"><div class="ui-btn-inner ui-li"><div class="ui-btn-text"><a href="#" class="ui-link-inherit"><h3 class="ui-li-heading">' + item.name + '</h3><p><span class="todo-details">Pomodoros: ' + item.pomodoros + '</span><span class="todo-details">Interruptions: ' + item.interruptions + '</span></p></a></div><span class="ui-icon ui-icon-arrow-r ui-icon-shadow">&nbsp;</span></div></li>';
        }
    }
    if (ele) {
        ele.html(output);
    }
}

function displaytrack(item) {
    $('#content').hide();
    $('#details').show();
    $('#back').show();
    $('#details h5').html(item.name);
    $('#start-pomodoro').attr('data-id', item.id);
    $('#start-pomodoro').attr('data-qty', item.pomodoros);
    $('#add-interruption').attr('data-id', item.id);
    $('#add-interruption').attr('data-qty', item.interruptions);
    $('#details span#pomodoros').html("Pomodoros: " + item.pomodoros);
    $('#details span#interruptions').html("Interruptions: " + item.interruptions);
}

var timer = null;
var lapsed = 0;
var pomodoroDuration = 1*60*1000;

var timer;
var timerCurrent;
var timerFinish;
var timerSeconds = 1*60;

function pad(int) {
    if (int < 10) {
        return '0' + int;
    }
    return int;
}

function getTime() {
    if (lapsed === 0) {
        return '45:00';
    } else {
        var d = new Date(2000,0,0,0,45,00,0);
        d.setMilliseconds(d.getMilliseconds() - lapsed);
        return pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }
}

function startPomodoro() {
    var ele = $(this);
    if (ele.val() === 'Start pomodoro') {
        timer = setInterval(checkClock, 1000);
        ele.val('Stop pomodoro');
        ele.siblings('.ui-btn-inner').first().html('Stop pomodoro');

    } else {
        clearInterval(timer);
        ele.val('Start pomodoro');
        ele.siblings('.ui-btn-inner').first().html('Start pomodoro');
        alertStopped()
    }
}

function checkClock() {
    if (lapsed < pomodoroDuration) {
        lapsed += 1000;
        var completion = ((lapsed*100)/pomodoroDuration);
        drawTimer(completion);
        $('#start-pomodoro').siblings('.ui-btn-inner').first().html('Stop pomodoro');
    } else {
        clearInterval(timer);
        savePomodoro();
        alertDone();
    }
}

function alertDone() {
    alert('Pomodoro finished');

}


function savePomodoro() {
    var ele = $('#start-pomodoro');
    var id = ele.attr('data-id');
    var pomodoros = Number(ele.attr('data-qty'));
    pomodoros +=1;
    $('#details span#pomodoros').html("Pomodoros: " + pomodoros);
    ele.attr('data-qty', pomodoros);
    if (db) {
            db.transaction(function(tx) {
                                        tx.executeSql("UPDATE Messages SET pomodoros = ? WHERE id = ?", [pomodoros, id], function() {
                                            ele.val('Start pomodoro');
                                            $('.progress-bar').hide();
                                            $('.completion').width('0%');
                                            ele.siblings('.ui-btn-inner').first().html('Start pomodoro');
                                        }, handleSQLError);
                                        }, handleTransactionError);
        }
}

function addInterruption() {
    var ele = $(this);
    var id = ele.attr('data-id');
    var interruptions = Number(ele.attr('data-qty'));
    interruptions +=1;
    $('#details span#interruptions').html("Interruptions: " + interruptions);
    ele.attr('data-qty', interruptions);
    if (db) {
            db.transaction(function(tx) {
                                        tx.executeSql("UPDATE Messages SET interruptions = ? WHERE id = ?", [interruptions, id], function() {}, handleSQLError);
                                        }, handleTransactionError);
        }
}

function track(id) {
    if (db) {
        db.transaction(function(tx) {
                                    tx.executeSql('SELECT id, name, pomodoros, interruptions FROM Messages WHERE id = ?', [id],
                                    function (tx, result) {
                                        var item = result.rows.item(0);
                                        displaytrack(item);
                                    },
                                    handleSQLError);
                                    }, handleTransactionError);
    }
}

/**
 * Make the following logic its own method, so it can be called from various sources.
 */
function displayMessages() {
    if (db) {
        db.transaction(function(tx) {
                                    tx.executeSql('SELECT id, name, pomodoros, interruptions FROM Messages', [], displayMessagesResults, handleSQLError);
                                    }, handleTransactionError);
    }
}

/**
 * Called when the user clicks on the 'Add Message' button.
 */
function addMessage(todo) {
    if (todo === "") {
        error("Enter a message");
    }
    else {
        if (db) {
            db.transaction(function(tx) {
                                        tx.executeSql("INSERT INTO Messages (name, pomodoros, interruptions) VALUES (?, ?, ?)", [todo, 0, 0], insertComplete, handleSQLError);
                                        displayMessages();
                                        }, handleTransactionError);
        }
    }
}
/**
 * Called when the user clicks on the 'Delete' hyperlink.
 */
function deleteRow(id) {
    if (db) {
        db.transaction(function(tx) {
                                    tx.executeSql('DELETE FROM Messages WHERE id = ?', [id], deleteComplete, handleSQLError);
                                    displayMessages();
                                    }, handleTransactionError);
    }
}


/**
 * SQLStatementCallback methods raised after the first table was created.  Add test data.
 * @param tx (SQLTransaction) has a single method: void executeSql(string sqlStatement, optional array args, optional SQLStatementCallBack callback, optional SQLStatementErrorCallback errorCallback)
 *     http://www.w3.org/TR/webdatabase/#sqltransaction
 * @param result (SQLResultSet) contains three attributes: insertId (readonly long), rowsAffected (readonly long), rows (readonly SQLREsultSetRowList)
 *     http://www.w3.org/TR/webdatabase/#sqlresultset
 */
function firstCreateComplete(tx, result) {
    displayMessages();
}

/**
 * DatabaseCallback method invoked when the Database is first created. Designed to initialize the schema by creating necessary table(s).
 *     http://www.w3.org/TR/webdatabase/#databasecallback
 * @param database (Database) - reference to the DB object that was creatd
 *     http://www.w3.org/TR/webdatabase/#database
 */
function createTableOnNewDatabase(database) {
    try {
        if (database) {
            //This method allows the page to verify the version number and change it at the same time as doing a schema update.
            //Getting this error on DB create: "current version of the database and `oldVersion` argument do not match", despite the fact that both values are ""
            //database.changeVersion("", "1.0", createFirstTable, handleTransactionError);
            //database.transaction(createFirstTable, handleTransactionError);
            database.transaction(function(tx) {
                                            //The following method is asyncronous, perform record insert statements within the callback method after table has been created successful
                                            tx.executeSql("CREATE TABLE IF NOT EXISTS Messages (id INTEGER PRIMARY KEY, name TEXT, pomodoros INTEGER, interruptions INTEGER)", [], firstCreateComplete, handleSQLError);
                                            }, handleTransactionError);
            displayMessages();
        }
    }
    catch(ex) {
        alert("exception (createTableOnNewDatabase): " + ex);
    }
}



/**
 * Called by page load event.  Opens DB reference and displays contents of Messages table
 */
function doPageLoad() {
    try {

        //Assign 2MB of space for the database
        var dbSize = 2 * 1024 * 1024;
        db = window.openDatabase("Pomodoro1", "1.0", "Pomodoro BBM", dbSize);

        createTableOnNewDatabase(db);
    }
    catch(e) {
        alert("exception (initPage): " + e.message);
    }
}
