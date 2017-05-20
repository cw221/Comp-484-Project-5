function Card(CardNumber, CardSuit, CardValue) {
    this.Number = CardNumber;
    this.Suit = CardSuit;
    this.Value = CardValue;
    this.toString = function () { return this.Number + " of " + this.Suit +"<br>"}
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
    this.drawCards = function () { return this.Cards.pop()}
    this.toString = function () { return this.Cards.toString()}
}

function Hand() {
    this.Cards = [];
    this.addCards = function (next) {
        if (this.Cards.length <5)
        this.Cards.push(next);
    }
    this.discardCards = function () {
        this.Cards.pop();
    }
    this.getHandSize = function () { return this.Cards.length}
    this.toString = function () { return this.Cards.toString() }
    this.getHighest = function () {
        var max = this.Cards[0];
        for (i = 1;i<this.Cards.length; i++) {
            if (this.Cards[i].getValue() > max.getValue()) max = this.Cards[i];
        }
        return max;
    }
}

function SeedDeck(newDeck) {
    var Number = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    var Suit = ['Spade', 'Hearts', 'Clover', 'Diamond'];
    var newCard;
    for (i = 0; i < 4; i++) {
        for (j = 0; j < 13; j++) {
            newCard = new Card(Number[j], Suit[i], j)
            newDeck.addCards(newCard);
        }
    }
}