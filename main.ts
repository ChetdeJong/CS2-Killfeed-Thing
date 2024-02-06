import fs from 'fs';
import path from 'path';
import readline from 'readline';

type kill = {
	id: number;
	matchChecksum: string;
	roundNumber: number;
	tick: number;
	frame: number;
	weaponName: string;
	weaponType: string;
	isHeadshot: boolean;
	killerName: string;
	killerSide: number;
	killerTeamName: string;
	killerSteamId: string;
	killerX: number;
	killerY: number;
	killerZ: number;
	victimName: string;
	victimSide: number;
	victimTeamName: string;
	victimSteamId: string;
	victimX: number;
	victimY: number;
	victimZ: number;
	assisterName: string;
	assisterSide: number;
	assisterSteamId: string;
	assisterTeamName: string;
	assisterX: number;
	assisterY: number;
	assisterZ: number;
	isKillerControllingBot: boolean;
	isKillerAirborne: boolean;
	isKillerBlinded: boolean;
	isVictimControllingBot: boolean;
	isVictimAirborne: boolean;
	isAssisterControllingBot: boolean;
	isVictimBlinded: boolean;
	isAssistedFlash: boolean;
	isTradeDeath: boolean;
	isTradeKill: boolean;
	penetratedObjects: number;
	isThroughSmoke: boolean;
	isNoScope: boolean;
	distance: number;
};

const input =
	'monte-vs-cloud9-m2-mirage\t163300-76561198975452660-5\nspirit-vs-themongolz-m1-mirage\t8900-76561199063238565-3';

const formatKills = (kills: kill[]) => {
	const out: string[][] = [];
	kills.forEach((kill, index) => {
		out.push([
			(index + 1).toString(),
			kill.killerSide === 2 ? 'T' : 'CT',
			kill.killerName,
			kill.victimSide === 2 ? 'T' : 'CT',
			kill.victimName,
			kill.weaponName.toLowerCase(),
			kill.isHeadshot ? 'TRUE' : 'FALSE',
			kill.penetratedObjects === 0 ? 'FALSE' : 'TRUE',
			kill.isNoScope ? 'TRUE' : 'FALSE',
			kill.isThroughSmoke ? 'TRUE' : 'FALSE'
		]);
	});
	return out;
};

const mostCommonWeapon = (values: string[]) => {
	let frequencyMap: { [key: string]: number } = values.reduce(
		(acc: { [key: string]: number }, val: string) => {
			acc[val] = (acc[val] || 0) + 1;
			return acc;
		},
		{}
	);

	let mostCommonItem = Object.keys(frequencyMap).reduce((a, b) =>
		frequencyMap[a] > frequencyMap[b] ? a : b
	);

	return mostCommonItem.toLowerCase();
};

const getFrag = (values: string, kills: kill[], index: number) => {
	const inputArray = values.split('-');
	const providedtick = parseInt(inputArray[0]);
	const steamId = inputArray[1];
	const fragnum = parseInt(inputArray[2]);

	const filteredKills = kills
		.filter((kill) => kill.killerSteamId === steamId)
		.filter((kill) => kill.tick >= providedtick)
		.slice(0, fragnum);

	const formattedKills = formatKills(filteredKills);

	const weapons = filteredKills.map((kill) => kill.weaponName);
	const weapon = mostCommonWeapon(weapons);

	formattedKills.unshift([
		'FRAG',
		`${index.toString()}`,
		`${filteredKills[0].killerName}-${filteredKills.length}k-${weapon}`
	]);

	return formattedKills;
};

const parseDemo = (input: string, startIndex: number = 1) => {
	const demoname = input.split('\t')[0];
	const values = input.split('\t')[1].split(',');
	const file = fs.readFileSync(path.resolve('./json', `${demoname}.json`), 'utf8');
	const json = JSON.parse(file);

	const kills: kill[] = json.kills;

	const out: string[][][] = [];

	values.forEach((value, index) => {
		const frag = getFrag(value, kills, startIndex + index);
		out.push(frag);
	});

	return out.map((frag) => frag.map((line) => line.join('\t')).join('\n')).join('\n');
};

const main = (input: string, startIndex: number = 1) => {
	const demos = input.split('\n');
	const out = demos.map((demo, index) => {
		if (demo === '') return '';
		return parseDemo(demo, index + startIndex);
	});
	return out.join('\n');
};

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const lines: string[] = [];

let startingindex: number;

rl.question('Enter starting index:', (answer) => {
	startingindex = parseInt(answer);
	console.log('Starting index:', startingindex);
	console.log('Paste demos data line by line, when done type "run" and press enter');
	console.log('');
	console.log('Data format: demoname    frag,frag,frag');
	console.log('Frag format: tick-steamid-fragnum');
	console.log(
		'Example: monte-vs-cloud9-m2-mirage    163300-76561198975452660-5,163300-76561198975452660-5'
	);
	console.log('');
	console.log('Note, there is tab between demoname and frags');
	console.log('');
	console.log('Dont forget to put .json files in json folder');
	console.log('');
});

rl.on('line', (line) => {
	if (line === 'run') {
		const res = main(input, startingindex);

		fs.writeFile('output.txt', res, (err) => {
			if (err) {
				console.error('An error occurred:', err);
			} else {
				console.log('Saved to output.txt');
			}
		});

		rl.close();
	}

	lines.push(line);
});
