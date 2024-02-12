import { parseEvent, parsePlayerInfo } from '@laihoe/demoparser2';
import { player_death, playerinfo } from './types';
import { getFrag } from './utils';
import path from 'path';
import { rootdir } from './main';

export const getKills = (file: string) => {
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

export const getPlayers = (file: string) => {
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

export const parseDemo = (input: string, startIndex: number = 1) => {
	const demoname = input.split('\t')[0];
	const values = input.split('\t')[1].split(',');
	const file = path.resolve(rootdir, 'demos', `${demoname}.dem`);

	const kills = getKills(file);

	const out: string[][][] = [];

	values.forEach((value, index) => {
		const frag = getFrag(value, kills, startIndex + index);
		if (frag === null) {
			startIndex--;
			return;
		}
		out.push(frag);
	});

	return out.map((frag) => frag.map((line) => line.join('\t')).join('\n'));
};

export const getKillfeed = (input: string, startIndex: number = 1) => {
	const rows = input.split('\n');

	const demos: string[] = [];

	let frags: string[] = [];
	let groups: string[][] = [];

	rows.forEach((row) => {
		const line = row.split('\t');

		if (
			line[0] === 'demoname' ||
			!(line[0] || line[1] || line[2]) ||
			line[0] === '' ||
			line[1] === '' ||
			line[2] === ''
		) {
			groups.push(frags);
			frags = [];
			return;
		}
		frags.push([line[0], line[1], line[2]].join(','));
	});

	groups.push(frags);

	groups.forEach((group) => {
		if (group.length === 0) return;

		const localdata: string[] = [];
		const fragsByPlayers = group.reduce((acc: { [key: string]: string[] }, row: string) => {
			const steam = row.split(',')[1];
			if (!acc[steam]) acc[steam] = [];
			acc[steam].push(row.split(',')[2]);
			return acc;
		}, {});

		const demoname = group[0].split(',')[0];

		Object.keys(fragsByPlayers).forEach((steamid) => {
			const frags = fragsByPlayers[steamid];
			const tick = (parseInt(frags[0]) - 5).toString();
			const fragNum = frags.length;
			localdata.push(`${tick}-${steamid}-${fragNum}`);
		});

		demos.push(`${demoname}\t${localdata.join(',')}`);
	});

	const out = demos.map((demo, index) => {
		if (demo === '') return '';
		const res = parseDemo(demo, index + startIndex);
		if (res.length === 0) {
			startIndex--;
			return '';
		}
		if (res.length > 1) startIndex = startIndex + res.length - 1;
		return res.join('\n');
	});
	return out.filter((demo) => demo !== '').join('\n');
};
