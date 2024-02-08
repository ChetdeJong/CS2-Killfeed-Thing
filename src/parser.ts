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
		out.push(frag);
	});

	return out.map((frag) => frag.map((line) => line.join('\t')).join('\n')).join('\n');
};

export const getKillfeed = (input: string, startIndex: number = 1) => {
	const demos = input.split('\n');
	const out = demos.map((demo, index) => {
		if (demo === '') return '';
		return parseDemo(demo, index + startIndex);
	});
	return out.join('\n');
};
