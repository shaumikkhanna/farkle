const diceContainer = document.getElementById("dice-container");
const rollBtn = document.getElementById("roll-btn");
const stopBtn = document.getElementById("stop-btn");
const lockInBtn = document.getElementById("lockin-btn");
const newTurnBtn = document.getElementById("new-turn-btn");
const statusText = document.getElementById("status");
const turnScoreText = document.getElementById("turn-score");
const totalScoreText = document.getElementById("total-score");
const infoBtn = document.getElementById("info-btn");
const cheatSheet = document.getElementById("cheat-sheet");
const cheatPopup = document.getElementById("cheat-popup");
const closePopup = document.getElementById("close-popup");

let dice = [];
let locked = Array(6).fill(false);
let selected = Array(6).fill(false);
let justRolled = Array(6).fill(false);
let currentTurnScore = 0;
let previousLockedScore = 0;
let totalScore = 0;
let hasLockedThisRoll = false;
let canSelectDice = false;
let canBank = false;
let canRoll = true;
let rollCount = 0;
let roundNumber = 0;

function rollDice() {
	if (!canRoll) {
		statusText.textContent = "You must lock in dice before rolling again!";
		return;
	}

	if (rollCount >= 3) {
		statusText.textContent = "You cannot roll more than 3 times in a turn!";
		return;
	}

	justRolled = Array(6).fill(false);
	canRoll = false;
	rollCount++;
	updateRoundInfo();

	for (let i = 0; i < 6; i++) {
		if (!locked[i]) {
			dice[i] = Math.floor(Math.random() * 6) + 1;
			selected[i] = false;
			justRolled[i] = true;
		}
	}

	hasLockedThisRoll = false;
	canSelectDice = false;
	canBank = false;

	// --- Farkle check ---
	const lockedDice = dice.filter((_, i) => locked[i]);
	const allDice = dice.filter((d) => d != null);
	const scoreBefore = calculateScore(lockedDice);
	const scoreAfter = calculateScore(allDice);

	if (scoreAfter === scoreBefore) {
		statusText.textContent = "Farkle! No scoring dice rolled.";
		currentTurnScore = 0;
		rollBtn.disabled = true;
		lockInBtn.disabled = true;
		stopBtn.disabled = true;
		newTurnBtn.disabled = false;
	} else {
		statusText.textContent = "Select dice and click Lock In.";
		lockInBtn.disabled = false;
		canSelectDice = true;
	}

	renderDice();
	justRolled = Array(6).fill(false);
}

function renderDice() {
	diceContainer.innerHTML = "";
	const lockedContainer = document.getElementById("locked-dice-container");
	lockedContainer.innerHTML = "";

	for (let i = 0; i < 6; i++) {
		const die = document.createElement("div");
		die.className = "die";

		if (dice[i]) {
			die.style.backgroundImage = `url('images/dice-${dice[i]}.png')`;

			if (justRolled[i]) {
				void die.offsetWidth;
				die.classList.add("roll");
			}
		}

		if (locked[i]) {
			die.classList.add("locked");
			lockedContainer.appendChild(die);
		} else {
			if (selected[i]) die.classList.add("selected");

			if (canSelectDice) {
				die.addEventListener("click", () => {
					selected[i] = !selected[i];
					renderDice();
				});
			}

			diceContainer.appendChild(die);
		}
	}
}

function allDiceUsedForScoring(indices) {
	const diceSubset = indices.map((i) => dice[i]);
	if (diceSubset.length !== 6) return false;

	const counts = Array(7).fill(0);
	for (let val of diceSubset) counts[val]++;

	let used = 0;

	// Special sets that use all dice
	if (counts.slice(1).every((c) => c === 1)) return true; // straight
	if (counts.slice(1).filter((c) => c === 2).length === 3) return true; // three pairs
	if (
		counts.find((c) => c === 4) !== undefined &&
		counts.find((c) => c === 2) !== undefined
	)
		return true; // four + pair
	if (counts.slice(1).filter((c) => c === 3).length === 2) return true; // two triples

	// 6/5/4 of a kind
	for (let i = 1; i <= 6; i++) {
		if (counts[i] === 6) {
			used += 6;
			counts[i] = 0;
		} else if (counts[i] === 5) {
			used += 5;
			counts[i] = 0;
		} else if (counts[i] === 4) {
			used += 4;
			counts[i] = 0;
		}
	}

	// Triplets
	for (let i = 1; i <= 6; i++) {
		if (counts[i] >= 3) {
			used += 3;
			counts[i] -= 3;
		}
	}

	// 1s and 5s
	used += counts[1]; // each 1 scores
	used += counts[5]; // each 5 scores

	return used === 6;
}

function lockInSelected() {
	if (hasLockedThisRoll) {
		statusText.textContent = "You already locked dice this roll!";
		return;
	}

	if (!canSelectDice) {
		statusText.textContent = "You must roll first.";
		return;
	}

	const anySelected = selected.some((s) => s);
	if (!anySelected) {
		statusText.textContent = "Select at least one die to lock!";
		return;
	}

	const testLocked = locked.map((l, i) => l || selected[i]);
	const testScore = calculateScore(dice.filter((_, i) => testLocked[i]));

	if (testScore > previousLockedScore) {
		locked = testLocked;
		currentTurnScore += testScore - previousLockedScore;
		previousLockedScore = testScore;
		selected.fill(false);
		hasLockedThisRoll = true;
		canSelectDice = false;
		canBank = true;
		canRoll = true;

		if (locked.every((l) => l)) {
			console.log("All dice locked in this roll.");

			const lockedIndices = locked
				.map((l, i) => (l ? i : -1))
				.filter((i) => i !== -1);

			if (allDiceUsedForScoring(lockedIndices)) {
				// Hot dice: bank score and start new turn
				totalScore += currentTurnScore;
				currentTurnScore = 0;
				previousLockedScore = 0;
				hasLockedThisRoll = false;
				canSelectDice = false;
				canBank = false;
				canRoll = true;
				rollCount = 0;

				statusText.textContent =
					"Hot dice! All dice scored — points banked. Roll again!";
				updateScores();

				locked.fill(false);
				selected.fill(false);
				renderDice();
				return;
			} else {
				// Not hot dice: all locked but not all scored → turn ends, bank points
				totalScore += currentTurnScore;
				currentTurnScore = 0;
				previousLockedScore = 0;
				hasLockedThisRoll = false;
				canSelectDice = false;
				canBank = false;
				canRoll = false;
				rollBtn.disabled = true;
				lockInBtn.disabled = true;
				stopBtn.disabled = true;
				newTurnBtn.disabled = false;
				statusText.textContent =
					"Not all dice scored. Turn over — points banked.";
				updateScores();
				renderDice();
				return;
			}
		}

		if (rollCount >= 3) {
			// Automatically end the turn
			totalScore += currentTurnScore;
			currentTurnScore = 0;
			previousLockedScore = 0;
			hasLockedThisRoll = false;
			canSelectDice = false;
			canBank = false;
			canRoll = false;
			rollBtn.disabled = true;
			lockInBtn.disabled = true;
			stopBtn.disabled = true;
			newTurnBtn.disabled = false;
			statusText.textContent =
				"Max rolls reached. Turn over — points banked.";
			updateScores();
		}

		statusText.textContent = "Dice locked in! Roll again or bank points.";
		lockInBtn.disabled = true;
		renderDice();
		updateScores();
	} else {
		statusText.textContent = "Lock must increase total score!";
	}
}

function stopTurn() {
	if (!canBank) {
		statusText.textContent = "You must pick some scoring dice.";
		return;
	}

	totalScore += currentTurnScore;
	currentTurnScore = 0;
	previousLockedScore = 0;
	hasLockedThisRoll = false;
	canSelectDice = false;
	canBank = false;
	canRoll = true;
	rollBtn.disabled = true;
	lockInBtn.disabled = true;
	stopBtn.disabled = true;
	newTurnBtn.disabled = false;
	statusText.textContent = "Score banked.";
	updateScores();
}

function checkAllDiceLocked() {
	return locked.every((l) => l);
}

function updateRoundInfo() {
	document.getElementById(
		"round-number"
	).textContent = `Round: ${roundNumber}`;
	document.getElementById(
		"roll-number"
	).textContent = `Roll: ${rollCount} / 3`;
}

function newTurn() {
	dice = Array(6).fill(null);
	locked = Array(6).fill(false);
	selected = Array(6).fill(false);
	justRolled = Array(6).fill(false);
	currentTurnScore = 0;
	previousLockedScore = 0;
	hasLockedThisRoll = false;
	canRoll = true;
	roundNumber++;
	rollCount = 0;
	updateRoundInfo();
	rollBtn.disabled = false;
	lockInBtn.disabled = false;
	stopBtn.disabled = false;
	newTurnBtn.disabled = true;
	statusText.textContent = "New turn! Roll to start.";
	updateScores();
	renderDice();
}

function bump(elem) {
	elem.classList.remove("bump");
	void elem.offsetWidth; // trigger reflow
	elem.classList.add("bump");
}

function updateScores() {
	const turnEl = document.getElementById("turn-score");
	const totalEl = document.getElementById("total-score");
	turnEl.textContent = currentTurnScore;
	totalEl.textContent = totalScore;
	bump(turnEl);
	bump(totalEl);
}

function calculateScore(diceArr) {
	if (diceArr.length === 0) {
		return 0;
	}

	const counts = Array(7).fill(0); // index 0 unused
	for (let val of diceArr) counts[val]++;

	const countValues = counts.slice(1);
	let score = 0;

	// --- Special combinations ---
	const isStraight = counts.slice(1).every((c) => c === 1);
	if (isStraight) {
		return 1500;
	}

	const pairs = countValues.filter((c) => c === 2).length;
	if (pairs === 3) {
		return 1500;
	}

	const fourOfKind = countValues.findIndex((c) => c === 4);
	const pair = countValues.findIndex((c) => c === 2);
	if (fourOfKind >= 0 && pair >= 0) {
		return 1500;
	}

	const triples = countValues.filter((c) => c === 3).length;
	if (triples === 2) {
		return 2500;
	}

	// --- Six/Five/Four of a kind ---
	for (let i = 1; i <= 6; i++) {
		if (counts[i] === 6) {
			score += 3000;
			counts[i] = 0;
		} else if (counts[i] === 5) {
			score += 2000;
			counts[i] = 0;
		} else if (counts[i] === 4) {
			score += 1000;
			counts[i] = 0;
		}
	}

	// --- Three of a kind scoring ---
	for (let i = 1; i <= 6; i++) {
		if (counts[i] >= 3) {
			let s = i === 1 ? 300 : i * 100;
			score += s;
			counts[i] -= 3;
		}
	}

	// --- Single 1s and 5s ---
	if (counts[1] > 0) {
		score += counts[1] * 100;
	}
	if (counts[5] > 0) {
		score += counts[5] * 50;
	}

	return score;
}

infoBtn.addEventListener("click", () => {
	console.log("Info button clicked");
	cheatSheet.classList.toggle("show");
});

infoBtn.addEventListener("click", () => {
	cheatPopup.classList.remove("hidden");
});

closePopup.addEventListener("click", () => {
	cheatPopup.classList.add("hidden");
});

// Initial setup
newTurn();
rollBtn.addEventListener("click", rollDice);
stopBtn.addEventListener("click", stopTurn);
newTurnBtn.addEventListener("click", newTurn);
lockInBtn.addEventListener("click", lockInSelected);
