import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { parseEvent, parseHeader, parsePlayerInfo } from '@laihoe/demoparser2';
import { header, player_death, playerinfo } from './types';

const rootdir = '../';

const formatKills = (kills: player_death[]) => {
	const out: string[][] = [];
	kills.forEach((kill, index) => {
		out.push([
			(index + 1).toString(),
			kill.attacker_team_name === 'TERRORIST' ? 'T' : 'CT',
			kill.attacker_name,
			kill.user_team_name === 'TERRORIST' ? 'T' : 'CT',
			kill.user_name,
			kill.weapon.trim().replace(/\s/g, '').toLowerCase(),
			kill.headshot ? 'TRUE' : 'FALSE',
			kill.penetrated === 0 ? 'FALSE' : 'TRUE',
			kill.noscope ? 'TRUE' : 'FALSE',
			kill.thrusmoke ? 'TRUE' : 'FALSE'
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

const getFrag = (values: string, kills: player_death[], index: number) => {
	const inputArray = values.split('-');
	const providedtick = parseInt(inputArray[0]);
	const steamId = inputArray[1];
	const fragnum = parseInt(inputArray[2]);

	const filteredKills = kills
		.filter((kill) => kill.attacker_steamid === steamId)
		.filter((kill) => kill.tick >= providedtick)
		.slice(0, fragnum);

	const formattedKills = formatKills(filteredKills);

	const weapons = filteredKills.map((kill) =>
		kill.weapon.trim().replace(/\s/g, '').toLowerCase()
	);
	const weapon = mostCommonWeapon(weapons);

	formattedKills.unshift([
		'FRAG',
		`${index.toString()}`,
		`${filteredKills[0].attacker_name}-${
			filteredKills.length
		}k-${weapon}-vs-${filteredKills[0].user_team_clan_name.trim().replace(/\s/g, '')}`
	]);

	return formattedKills;
};

const parseDemo = (input: string, startIndex: number = 1) => {
	const demoname = input.split('\t')[0];
	const values = input.split('\t')[1].split(',');
	const file = path.resolve(rootdir, 'demos', `${demoname}.dem`);

	const kills = getKills(file);

	const out: string[][][] = [];

	values.forEach((value, index) => {
		const frag = getFrag(value, kills, startIndex + index);
		out.push(frag);
	});

	return out.map((frag) => frag.map((line) => line.join('\t')).join('\n')).join('\n');
};

const getKillfeed = (input: string, startIndex: number = 1) => {
	const demos = input.split('\n');
	const out = demos.map((demo, index) => {
		if (demo === '') return '';
		return parseDemo(demo, index + startIndex);
	});
	return out.join('\n');
};

function saveToCSV(data: string) {
	const date = new Date();
	const current_date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(
		2,
		'0'
	)}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
	fs.writeFile(`${current_date}.csv`, data, (err) => {
		if (err) {
			console.error('An error occurred:', err);
		} else {
			console.log(`Saved to ${current_date}.csv`);
		}
	});
}

const getPlayers = (file: string) => {
	const players: playerinfo[] = parsePlayerInfo(file);

	const longestNameLength = players.reduce((max, player) => Math.max(max, player.name.length), 0);

	const tabSize = 8;

	const formattedPlayers = players
		.sort((a, b) => a.team_number - b.team_number)
		.map((player, index) => {
			const tabsNeeded =
				Math.ceil((longestNameLength + 1) / tabSize) -
				Math.floor(player.name.length / tabSize);

			if (!player.steamid) return '';
			if ((index + 1) % 5 === 0) {
				return player.name + '\t'.repeat(tabsNeeded) + player.steamid + '\n';
			}

			return player.name + '\t'.repeat(tabsNeeded) + player.steamid;
		})
		.join('\n');

	return formattedPlayers;
};

const getKills = (file: string) => {
	const kills: player_death[] = parseEvent(
		file,
		'player_death',
		['is_warmup_period', 'team_name', 'team_clan_name', 'team_rounds_total'],
		['total_rounds_played', 'round_win_status']
	);
	let killsNoWarmup = kills.filter((kill) => kill.is_warmup_period == false);
	let filteredKills = killsNoWarmup.filter(
		(kill) => kill.attacker_team_name != kill.user_team_name
	);

	return filteredKills;
};

const getKillsByRound = (
	filteredKills: player_death[]
): { [key: number]: { [key: string]: player_death[] } } => {
	const killsByRound = filteredKills.reduce(
		(acc: { [key: number]: { [key: string]: player_death[] } }, kill: player_death) => {
			const round = kill.total_rounds_played;
			if (!acc[round]) {
				acc[round] = {};
			}
			if (!acc[round][kill.attacker_steamid]) {
				acc[round][kill.attacker_steamid] = [];
			}
			acc[round][kill.attacker_steamid].push(kill);
			return acc;
		},
		{}
	);

	return killsByRound;
};

const getFormattedKills = (
	demo: string,
	params: {
		steamid?: string;
		includedKills: number[];
	}
) => {
	const kills = getKills(demo);
	const killsByRounds = getKillsByRound(kills);
	const header: header = parseHeader(demo);

	const frags = [];

	function getAllKills(
		kills: { [key: string]: player_death[] },
		params: {
			steamid?: string;
			includedKills: number[];
		}
	) {
		return Object.keys(kills).reduce((acc, steamid) => {
			if (kills[steamid].length === 0) return acc;
			if (!params.includedKills.includes(kills[steamid].length)) return acc;
			acc.push(...kills[steamid]);
			return acc;
		}, [] as player_death[]);
	}

	for (const round in killsByRounds) {
		const playerKills = params.steamid
			? killsByRounds[round][params.steamid]
			: getAllKills(killsByRounds[round], params);

		if (!playerKills) continue;
		const kills = playerKills.map((kill) => [
			header.map_name,
			(kill.total_rounds_played + 1).toString(),
			kill.tick.toString(),
			kill.attacker_team_clan_name,
			kill.attacker_name,
			kill.weapon,
			kill.user_team_clan_name,
			kill.user_name
		]);
		if (kills.length === 0) continue;
		if (!params.includedKills.includes(kills.length)) continue;
		frags.push(...kills, ['']);
	}

	if (frags.length === 0) return '';

	return frags.map((frag) => frag.join('\t')).join('\n');
};

// const testdemo = path.resolve('../demos', '87000_m0NESY_vertigo_dglshit.dem');
// saveToCSV(getKillsFromPlayer(testdemo, { includedKills: [3] }));

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const askForDemos = async (): Promise<string> => {
	const lines: string[] = [];

	let startingindex: number;
	return new Promise((resolve) => {
		console.clear();
		rl.question('Enter starting index:', (answer) => {
			startingindex = parseInt(answer);
			console.log('Starting index:', startingindex);
			console.log('Paste demos data line by line, when done type "run" and press enter');
			console.log('');
			console.log('Data format: demoname    frag,frag,frag');
			console.log('Frag format: tick-steamid-numberOfKills');
			console.log(
				'Example: monte-vs-cloud9-m2-mirage    163300-76561198975452660-5,163300-76561198975452660-5'
			);
			console.log('');
			console.log('Note, there is tab between demoname and frags');
			console.log('');
		});

		rl.on('line', (line) => {
			if (line === 'run') {
				const res = getKillfeed(lines.join('\n'), startingindex);
				resolve(res);
			}
			lines.push(line);
		});
	});
};

const demos = fs.readdirSync(path.resolve(rootdir, 'demos'));
if (demos.length === 0) {
	console.log('No demos found in demos folder');
	process.exit(0);
}

const getSelectedDemos = (demos: string[]): Promise<string[]> => {
	return new Promise((resolve) => {
		console.clear();
		const demosList = demos.map((demo, index) => {
			return { index: index + 1, demo };
		});

		const demosListString = demosList.map((demo) => `${demo.index}) ${demo.demo}`).join('\n');

		rl.question(
			'Select demos:\nEnter in following format 1,2,3,4,5 or leave blank for all\n' +
				demosListString +
				'\n\n',
			(answer) => {
				if (answer === '') {
					console.log('Selected all demos');
					resolve(demos);
				} else {
					if (
						answer
							.split(',')
							.map((val) => parseInt(val))
							.some((val) => val <= demos.length && val > 0)
					) {
						const res = answer
							.split(',')
							.map(
								(val) =>
									demosList.filter((demo) => demo.index === parseInt(val))[0].demo
							);
						console.log('Selected demos:', res.join('\n'));
						resolve(res);
					} else {
						getSelectedDemos(demos).then(resolve);
					}
				}
			}
		);
	});
};

const getSteamParam = async (): Promise<string | undefined> => {
	return new Promise((resolve) => {
		console.clear();
		rl.question('Enter steamid:\nor leave blank for all players\n\n', (answer) => {
			if (answer === '') {
				console.log('Selected all players');
				resolve(undefined);
			}
			console.log('Steamid:' + answer);
			resolve(answer);
		});
	});
};

const getKillsParams = async (): Promise<number[]> => {
	return new Promise((resolve) => {
		console.clear();

		rl.question(
			'Which kills include?\nEnter in following format 1,2,3,4,5 e.g. 3,4,5 for 3k, 4k, 5k\nor leave blank for all\n\n',
			(answer) => {
				if (answer === '') {
					resolve([1, 2, 3, 4, 5]);
				} else {
					if (
						answer
							.split(',')
							.map((val) => parseInt(val))
							.some((val) => val < 6 && val > 0)
					) {
						resolve(answer.split(',').map((val) => parseInt(val)));
					} else {
						getKillsParams().then(resolve);
					}
				}
			}
		);
	});
};

const menu = () => {
	console.clear();
	rl.question(
		'Select function:\n1) Parse demos for frags\n2) Parse demos for killfeed\n3) Parse players from demo\n\n',
		async (answer) => {
			if (answer !== '1' && answer !== '2' && answer !== '3') {
				console.log('Invalid selection. Please enter 1, 2, or 3.');
				menu();
			} else {
				if (answer === '1') {
					const steamid = await getSteamParam();
					const includedKills = await getKillsParams();
					const selected = await getSelectedDemos(demos);
					const res = [
						[
							'map',
							'round',
							'tick',
							'attacker_team',
							'attacker',
							'weapon',
							'victim_team',
							'victim'
						].join('\t')
					];
					if (selected.length === 1) {
						const parsed = getFormattedKills(
							path.resolve(rootdir, 'demos', selected[0]),
							{
								steamid,
								includedKills
							}
						);
						if (parsed !== '') {
							res.push();
							saveToCSV(res.join('\n'));
						}
					} else {
						demos.forEach((demo) => {
							const parsed = getFormattedKills(path.resolve(rootdir, 'demos', demo), {
								steamid,
								includedKills
							});
							if (parsed !== '') {
								res.push(demo);
								res.push(parsed);
							}
						});
						if (res.length > 1) {
							saveToCSV(res.join('\n'));
						} else {
							console.log('No frags found');
						}
					}
					rl.close();
				}
				if (answer === '2') {
					const res = await askForDemos();
					if (res !== '') {
						saveToCSV(res);
					} else {
						console.log('No frags found');
					}
					rl.close();
				}
				if (answer === '3') {
					const selected = await getSelectedDemos(demos);
					console.log('');
					if (selected.length === 1) {
						const res = getPlayers(path.resolve(rootdir, 'demos', selected[0]));
						console.log(res);
					} else {
						selected.forEach((demo) => {
							console.log(demo + '\n');
							console.log(getPlayers(path.resolve(rootdir, 'demos', demo)));
						});
					}
					rl.close();
				}
			}
		}
	);
};

menu();
