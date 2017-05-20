var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//implements card and deck object and required functions
function Card(CardNumber, CardSuit, CardValue) {
	this.Number = CardNumber;
	this.Suit = CardSuit;
	this.Value = CardValue;
	this.toString = function () { return this.Number + " of " + this.Suit + "<br>" }
	this.getNumber = function () { return this.Number }
	this.getSuit = function () { return this.Suit }
	this.getValue = function () { return this.Value }
}

function Deck() {
	this.Cards = [];
	this.shuffle = function () {
		var placeholder, random;
		for (i = 1; i < this.Cards.length; i++) {
			random = Math.floor(Math.random() * this.Cards.length);
			placeholder = this.Cards[random];
			this.Cards[random] = this.Cards[i];
			this.Cards[i] = placeholder;
		}
	}
	this.addCards = function (next) {
		this.Cards.push(next);
	}
	this.drawCards = function () { return this.Cards.pop() }
	this.deckSize = function () { return this.Cards.length }
	this.toString = function () { return this.Cards.toString() }
}

function SeedDeck(newDeck) {
	var Number = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
	var Suit = ['Spade', 'Hearts', 'Clover', 'Diamond'];
	var newCard;
	for (i = 0; i < 4; i++) {
		for (j = 0; j < 13; j++) {
			newCard = new Card(Number[j], Suit[i], j)
			newDeck.addCards(newCard);
		}
	}
}
		
		
app.get('/', function (req, res) {
	res.sendFile(__dirname+'/Poker.html');
});

//list of variables used in the function
users = [];
var NumofConnection = 0;
var currRound;
var Ready = 0;
var newDeck;
var currentBet=0;
var totalLoot = 0;
var finBet = 0;
var burnRound = 0;
var roundCalculator = [0,0];
var winner=0;
var gameInProgress=false;
io.on('connection', function (socket) {
	console.log('A user connected');
	
	//to enter a game, you must use a temporary log in.
	socket.on('setUsername', function(data){
		console.log(data);
		if(users.indexOf(data) > -1){
			socket.emit('userExists', data + ' is taken!');
		}
		else{
			if (NumofConnection< 4) {
				if (!gameInProgress) {
					users.push(data);				
					socket.emit('userSet', {username: data});
					NumofConnection++;
				} else {
					socket.emit('userExists', 'Game is currently under progress!');
				}
			} else {
				socket.emit('userExists', 'Player limit reached!');
			}
		}
	});
	
	//you can leave a game anytime.
	socket.on('LogOut', function(data){
		var index = users.indexOf(data);
		users.splice(index,1);
		socket.emit('userLeft', {username: data});
		NumofConnection--;
		if (NumofConnection==1) {
			io.sockets.emit('victory', data);
			gameInProgress=false;
		}
	})
	
	//give a card from the deck to the requesting client
	socket.on('drawCard', function(data){
		console.log(newDeck.deckSize());
		thisCard=newDeck.drawCards()
		socket.emit('receiveCard', {Value:thisCard.getValue(),Suit:thisCard.getSuit(),Number:thisCard.getNumber()});
	})
	
	//receives the bet increase and applies it. 
	//broadcasts to all player that bet was raised.
	socket.on('raiseBet', function(data){
		finBet=0;
		totalLoot += data.add;
		if (data.total > currentBet) {
			currentBet=data.total;
			io.sockets.emit('send', data.user+' has raised bet by '+data.add+' to '+currentBet+'. has '+ data.coin+' left');
		} else {
			io.sockets.emit('send', data.user+' has increased his bet by '+data.add+' to '+currentBet+'. has '+ data.coin+' left');
		}
		io.sockets.emit('mustMeet', currentBet);	
	})
	
	//minor chat system between players
	socket.on('msg', function(data){
		//Send message to everyone
		io.sockets.emit('newmsg', data);
	})
	
	//Sends a winner feed and how they won.
	socket.on('winnerBroadcast', function(data){
		var condition = 'single';
		switch (data.Power) {
			case 1: condition = 'single'; break;
			case 2: condition = 'double'; break;
			case 3: condition = 'two pair'; break;
			case 4: condition = 'triple'; break;
			case 5: condition = 'straight'; break;
			case 6: condition = 'flush'; break;
			case 7: condition = 'full house'; break;
			case 8: condition = 'four of a kind'; break;
			case 9: condition = 'straight flush'; break;
			case 10: condition = 'royal flush'; break;
		}
		io.sockets.emit('send', data.name+' has won with a '+condition);
	})
	
	//Sometimes, games end with a tie. Tie still needs broadcasting.
	socket.on('tiedWinnerBroadcast', function(data){
		var condition = 'single';
		switch (data.Power) {
			case 1: condition = 'single'; break;
			case 2: condition = 'double'; break;
			case 3: condition = 'two pair'; break;
			case 4: condition = 'triple'; break;
			case 5: condition = 'straight'; break;
			case 6: condition = 'flush'; break;
			case 7: condition = 'full house'; break;
			case 8: condition = 'four of a kind'; break;
			case 9: condition = 'straight flush'; break;
			case 10: condition = '...royal flush?!'; break;
		}
		io.sockets.emit('send', data.name+' has tied with a '+condition);
	})
	
	//All currently logged in players (min 2,max 4) must hit ready for game to start
	socket.on('GameReady', function(data){
		//Send message to everyone
		Ready++;
		console.log(Ready);
		console.log(NumofConnection)
		if (Ready==NumofConnection && Ready >1) {
			console.log('ok');
			gameInProgress=true;
			newDeck = new Deck();
			currRound=NumofConnection;
			SeedDeck(newDeck);
			newDeck.shuffle();
			burnRound=0;
			currentBet=1;
			finBet=0;
			roundCalculator=[0,0];
			totalLoot=NumofConnection;
			io.sockets.emit('readyBroadcast', data);
			io.sockets.emit('ready', data);
		} else {
			io.sockets.emit('readyBroadcast', data);
		}
	})
	
	//requests for current round of betting to be over. 
	//if all player requests end of betting, the game moves onto next phase.
	socket.on('finishBet', function(data){
		//Send message to everyone
		finBet++;
		io.sockets.emit('send', data+' wants to end Betting');
		if (finBet==currRound) {
			if (burnRound<2) {
				io.sockets.emit('send', 'Start burning');
				io.sockets.emit('startBurn', data);
				burnRound++;
				finBet=0;
			} else {
				console.log(finBet);
				io.sockets.emit('finishRound', data);
				burnRound=0;
				finBet=0;
			}
		} else {
			
			socket.emit('waitingResponse', '');
		}
	})
	
	//finished burning. 
	//if all player finishes burning, the game moves onto next phase.
	socket.on('finishedBurn', function(data){
		//Send message to everyone
		finBet++;
		io.sockets.emit('send', data.user+' has burned ' +data.num+ ' cards');
		if (finBet==currRound) {
			io.sockets.emit('startBet', data);
			io.sockets.emit('send', 'Start betting');
			finBet=0
		} else {
			socket.emit('waitingResponse', data);
		}
	})
	
	//handles player defeat.
	socket.on('PlayerOut', function(data){
		console.log('dead');
		io.sockets.emit('send', data+' was defeated!');
		NumofConnection--;
		socket.emit('close', data);
		if (NumofConnection==1) {
			io.sockets.emit('victory', data);
			gameInProgress=false;
			users=[];
		}
	})
	
	//handles when player forfeits only current round.
	socket.on('die', function(data){
		//Send message to everyone
		currRound--;
		io.sockets.emit('send', data+' has died');
		if (currRound==1) {
			burnRound=2;
			currRound=NumofConnection;
			io.sockets.emit('SingleRemain', data);
		} else {
			console.log('');
			socket.emit('waitingResponse', data);
		}
	})
	
	//calculates the victor of current round.
	socket.on('calculateRound', function(data){
		finBet++;
		if (data[0]==roundCalculator[0]) {
			if (data[1]>roundCalculator[1]) {
				winner=1;
				roundCalculator[0]=data[0];
				roundCalculator[1]=data[1];
			} else {
				if (data[1]==roundCalculator[1]) {
					winner++;
				}
			}
		}
		if (data[0]>roundCalculator[0]) {
			winner=1;
			roundCalculator[0]=data[0];
			roundCalculator[1]=data[1];
		}
		if (finBet==NumofConnection) {
			console.log('success');
			io.sockets.emit('WinorLose', {Winner:roundCalculator[0],Power:roundCalculator[1],Winning:totalLoot,NumofWinner:winner});
		} else {
			socket.emit('waitingResponse', data);
		}
		Ready =0;
	})
	
	socket.on('clientEvent', function (data) {
		console.log(data);
	});
	//Handle disconnect
	socket.on('disconnect', function () {
		console.log('A user disconnected');
	});

});

http.listen(3000, function () {
	console.log('listening on *:3000');
});