import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { getKillfeed, getPlayers } from './parser';
import { getFormattedKills, saveToCSV } from './utils';

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

if (!fs.readdirSync(path.resolve(rootdir)).includes('demos')) {
	console.log('demos folder not found, create it.');
	process.exit(0);
}
const demos = fs.readdirSync(path.resolve(rootdir, 'demos'));
if (demos.length === 0) {
	console.log('No demos found in demos folder');
	process.exit(0);
}

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
							path.resolve(rootdir, 'demos', `${selected[0]}.dem`),
							{
								steamid,
								includedKills
							}
						);
						if (parsed !== '') {
							res.push(selected[0]);
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
								res.push(demo.split('.')[0]);
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
			}
		}
	);
};

menu();
