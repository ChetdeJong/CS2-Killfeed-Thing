import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { getKillfeed, getPlayers } from './parser';
import { formatInAndOutPoints, getFormattedKills, saveToCSV } from './utils';
const packageJson = require('../package.json');

export const rootdir = './';

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
			if (isNaN(Number(startingindex)) || startingindex <= 0) {
				startingindex = 1;
			}
			console.log('Starting index:', startingindex);
			console.log('Paste frags data line by line in following format:');
			console.log('');
			console.log('demoname    steamid    tick');
			console.log('');
			console.log('Note, there these are separated by tabs.');
			console.log('Separate groups by empty line.');
			console.log('');
			console.log('Example:');
			console.log(
				'faze-vs-g2-m1-inferno    76561197998926770    141134\nfaze-vs-g2-m1-inferno    76561197998926770    141282\nfaze-vs-g2-m1-inferno    76561197998926770    141373'
			);
			console.log('');
			console.log(
				'faze-vs-g2-m2-ancient    76561198074762801    162312\nfaze-vs-g2-m2-ancient    76561198074762801    164096\nfaze-vs-g2-m2-ancient    76561198074762801    165597'
			);
			console.log('');
			console.log('When done type "run" on new line and press enter');
			console.log('');
		});

		rl.on('line', (line) => {
			if (line === 'run') {
				const res = getKillfeed(lines.join('\n'), startingindex);
				res ? resolve(res) : resolve('');
			}
			lines.push(line);
		});
	});
};

const checkDemos = () => {
	if (!fs.readdirSync(path.resolve(rootdir)).includes('demos')) {
		console.log('demos folder not found, create it.');
		process.exit(0);
	}
	const demos = fs.readdirSync(path.resolve(rootdir, 'demos'));
	if (demos.length === 0) {
		console.log('No demos found in demos folder');
		process.exit(0);
	}
	return demos;
};

const getSelectedDemos = (demos: string[]): Promise<string[]> => {
	return new Promise((resolve) => {
		console.clear();
		const demosList = demos.map((demo, index) => {
			return { index: index + 1, demo: demo.split('.')[0] };
		});

		const demosListString = demosList.map((demo) => `${demo.index}) ${demo.demo}`).join('\n');

		rl.question(
			'Select demos:\nEnter in following format 1,2,3,4,5 or leave blank for all\n' +
				demosListString +
				'\n\n',
			(answer) => {
				if (answer === '') {
					console.log('Selected all demos');
					resolve(demos.map((demo) => demo.split('.')[0]));
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
						console.log(`Selected demos:\n${res.join('\n')}`);
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

const askForTimecodes = async (): Promise<string | undefined> => {
	const lines: string[] = [];
	return new Promise((resolve) => {
		console.clear();
		console.log(
			'Paste timecodes from spreadsheet\n\nformat:\ntimecode    name\ntimecode    name\ntimecode    name\n\nNote, there is tab between\n'
		);

		console.log(
			'When using this script make sure you have named everything correctly and markers dont overlap with campaths.'
		);

		console.log(
			'Check video tutorial for details: https://github.com/ChetdeJong/CS2-Killfeed-Thing\n'
		);

		console.log('When done type "run" on new line and press enter\n\n');
		rl.on('line', (line) => {
			if (line === 'run') {
				const res = formatInAndOutPoints(lines);
				resolve(res);
			}
			lines.push(line);
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
	console.log(`Killfeed thing v${packageJson.version}`);
	console.log('https://github.com/ChetdeJong/CS2-Killfeed-Thing\n');

	rl.question(
		'Select function:\n1) Parse demos for frags\n2) Parse demos for killfeed\n3) Parse players from demo\n4) Get in and out points from timecodes\n\n',
		async (answer) => {
			if (answer !== '1' && answer !== '2' && answer !== '3' && answer !== '4') {
				console.log('Invalid selection. Please enter 1, 2, 3 or 4.');
				menu();
			} else {
				if (answer === '1') {
					const demos = checkDemos();
					const steamid = await getSteamParam();
					const includedKills = await getKillsParams();
					const selected = await getSelectedDemos(demos);
					const res = [
						[
							'demoname',
							'attacker_steamid',
							'tick',
							'attacker_team',
							'attacker',
							'weapon',
							'victim_team',
							'victim',
							'round',
							'map'
						].join('\t')
					];
					if (selected.length === 1) {
						const parsed = getFormattedKills(
							path.resolve(rootdir, 'demos', `${selected[0]}.dem`),
							{
								steamid,
								includedKills
							}
						);
						if (parsed !== '') {
							res.push(parsed);
							saveToCSV(res.join('\n'));
						}
					} else {
						selected.forEach((demo) => {
							const parsed = getFormattedKills(
								path.resolve(rootdir, 'demos', `${demo}.dem`),
								{
									steamid,
									includedKills
								}
							);
							if (parsed !== '') {
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
					checkDemos();
					const res = await askForDemos();
					if (res !== '') {
						saveToCSV(res);
					} else {
						console.log('No frags found');
					}
					rl.close();
				}
				if (answer === '3') {
					const demos = checkDemos();
					const selected = await getSelectedDemos(demos);
					console.log('');
					if (selected.length === 1) {
						const res = getPlayers(
							path.resolve(rootdir, 'demos', `${selected[0]}.dem`)
						);
						console.log(res);
					} else {
						selected.forEach((demo) => {
							console.log(demo + '\n');
							console.log(getPlayers(path.resolve(rootdir, 'demos', `${demo}.dem`)));
						});
					}
					rl.close();
				}

				if (answer === '4') {
					const res = await askForTimecodes();
					if (res) {
						saveToCSV(res);
					} else {
						console.log('Couldnt parse timecodes');
					}
					rl.close();
				}
			}
		}
	);
};

menu();
