var http = require('http');
var async = require('async');
var fs = require('fs');

//get the directory
var myDirectory = fs.readFileSync('words.txt');

var myWord = myDirectory.toString().split('\n');
var post_data = {
    "playerId": "lihengpro@gmail.com",
    "action": "startGame"
};
// for test
var sessionId = 'ff270194dfe267819efc7b250e933a65';

var getScore = false;
var content = JSON.stringify(post_data);
var options = {
    hostname: 'strikingly-hangman.herokuapp.com',
    path: '/game/on',
    method: 'POST',
    headers: {
        'Content-Type': 'multipart/related',
        'Content-Length': content.length
    }
};
// list letter by the probability of occurrence
var letterArray = [
    'E', 'T', 'A', 'O', 'I', 'N', 'R', 'S', 'H', 'L', 'M', 'D', 'C', 'P', 'U', 'F', 'G', 'W', 'Y', 'B', 'V', 'K', 'X', 'J', 'Q', 'Z'
];
var resultWord = '';

function allIndexOf(str,lett){
  var result = [];
  for(var i=0; i<str.length;i++) {
    if (str[i] === lett) result.push(i);
  }
  return result;
}

//waterfall process for post request
async.waterfall([
    // start game
    function(callback) {
        // var step1 = http.request(options, function(res) {
        //     console.log('STEP1');
        //     console.log('STATUS: ' + res.statusCode);
        //     var responeString = "";
        //     res.on('data', function(data) {
        //         responeString += data;
        //     });
        //     res.on('end', function() {
        //         var sessionId = JSON.parse(responeString).sessionId;
        //         callback(null, sessionId);
        //     });
        // });
        // step1.write(content);
        // step1.end();
        callback(null, sessionId);
    },
    // give me a word
    function(sessionId, callback) {
        // var numberOfWordsToGuess = JSON.parse(responeString).data.numberOfWordsToGuess;
        var content2 = JSON.stringify({
            "sessionId": sessionId,
            "action": "nextWord"
        });
        options.headers['Content-Length'] = content2.length;
        var step2 = http.request(options, function(res) {
            console.log('STEP2');
            console.log('STATUS: ' + res.statusCode);
            var responeString = '';
            res.on('data', function(data) {
                responeString += data;
            });
            res.on('end', function() {
                var word = JSON.parse(responeString).data.word;
                callback(null, sessionId, word);
            });
        });
        step2.write(content2);
        step2.end();
    },
    // make a guess
    function(sessionId, getWord, callback) {
        console.log('STEP3');
        var starflag = getWord.length;
        async.filter(myWord, function(word, callback) {
            callback(word.length === getWord.length);
        }, function(results) {
            myWord = results;
        });

        var content3 = JSON.stringify({
            "sessionId": sessionId,
            "action": "guessWord",
            "guess": 'A'
        });
        options.headers['Content-Length'] = content3.length;
        var guessWord = letterArray.shift();
        console.log('myWord length: ' + myWord.length);

        function tryGuess(guessWord, options, sessionId, starflag) {
            console.log('guessWord: ' + guessWord);
            if (starflag === 0) {
                console.log('resultWord:' + resultWord);
                callback(null, sessionId);
                return;
            }
            content3 = JSON.stringify({
                "sessionId": sessionId,
                "action": "guessWord",
                "guess": guessWord
            });
            var step3 = http.request(options, function(res) {
                var responeString = '';
                res.on('data', function(data) {
                    responeString += data;
                });
                res.on('end', function() {
                    resultWord = JSON.parse(responeString).data.word;
                    console.log('result:' + resultWord);
                    starflag = 0;
                    for(var i = 0 ; i < resultWord.length;i++){
                      if(resultWord[i]==='*') starflag++;
                    }
                    console.log('starflag: ' + starflag);
                    if (starflag != resultWord.length) {
                        if (resultWord.indexOf(guessWord) >= 0) {
                            console.log('being guess');
                            // var wordLoc = resultWord.indexOf(guessWord);
                            if (typeof myWord[0] === undefined) {
                                callback(null, sessionId);
                                return;
                            }
                            // filter my directory
                            async.filter(myWord, function(word, callback) {
                              var temp = allIndexOf(resultWord,guessWord);
                              // console.log('indexOf :' + temp);
                                // callback(word.indexOf(guessWord.toLowerCase()) === wordLoc);
                                callback(temp.toString()===allIndexOf(word,guessWord.toLowerCase()).toString())
                            }, function(results) {
                                myWord = results;
                                console.log('myWord length:' + myWord.length);
                                console.log('myWord[0]' + myWord[0]);
                                if (typeof myWord[0] === undefined) {
                                  callback(null, sessionId);
                                  return;
                                }
                                async.filter(myWord[0].split(''), function(tempWord, callback) {
                                    callback(letterArray.indexOf(tempWord.toUpperCase()) != -1);
                                }, function(results) {
                                    guessWord = results.slice(-1).toString().toUpperCase();
                                    letterArray.splice(letterArray.indexOf(guessWord), 1);
                                    // console.log('guessWord: ' + guessWord + ' letterArray: ' + letterArray);
                                    tryGuess(guessWord, options, sessionId, starflag);
                                });
                            });
                        } else {
                            async.filter(myWord, function(word, callback) {
                                callback(word.indexOf(guessWord.toLowerCase()) === -1);
                            }, function(results) {
                                myWord = results;
                                console.log('myWord length:' + myWord.length);
                                console.log('myWord[0]' + myWord[0]);
                                if (typeof myWord[0] === undefined) {
                                  callback(null, sessionId);
                                  return;
                                }
                                async.filter(myWord[0].split(''), function(tempWord, callback) {
                                    callback(letterArray.indexOf(tempWord.toUpperCase()) != -1);
                                }, function(results) {
                                    guessWord = results.slice(-1).toString().toUpperCase();
                                    letterArray.splice(letterArray.indexOf(guessWord), 1);
                                    tryGuess(guessWord, options, sessionId, starflag);
                                });
                            });
                        }
                    } else {
                        async.filter(myWord, function(word, callback) {
                            callback(word.indexOf(guessWord.toLowerCase()) === -1);
                        }, function(results) {
                            myWord = results;
                            console.log('myWord length:' + myWord.length);
                            guessWord = letterArray.shift();
                            tryGuess(guessWord, options, sessionId, starflag);
                        });
                    }
                });
            });
            step3.write(content3);
            step3.end();
        }
        tryGuess(guessWord, options, sessionId, starflag);
    },
    //get your result
    function(sessionId, callback) {
        console.log('arg: ' + sessionId);
        var content4 = JSON.stringify({
            "sessionId": sessionId,
            "action": "getResult"
        });
        options.headers['Content-Length'] = content4.length;
        var step4 = http.request(options, function(res) {
            console.log('STEP4');
            console.log('STATUS: ' + res.statusCode);
            var responeString = '';
            res.on('data', function(data) {
                responeString += data;
            });
            res.on('end', function() {
                var score = JSON.parse(responeString).data.score;
                callback(null, score);
            });
        });
        step4.write(content4);
        step4.end();
    },
    function(score, callback) {
        console.log('score: ' + score);
    }
]);
