const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const packageJson = require('./package.json');
const ZipPlugin = require('zip-webpack-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');

module.exports = {
	entry: './src/main.ts',
	devtool: 'inline-source-map',
	target: 'node',
	mode: 'production',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: [/node_modules/, /dist/, /build/]
			},
			{
				test: /\.node$/,
				use: 'node-loader'
			}
		]
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'build', 'dist'),
		clean: true
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, 'src', 'start.bat')
				}
			]
		}),
		new ZipPlugin({
			filename: `${packageJson.name}-${packageJson.version}.zip`,
			path: path.resolve(__dirname, 'build'),
			// pathPrefix: "dist",
			pathMapper: function (assetPath) {
				// put all .bat files in the root of the zip
				if (assetPath.endsWith('.bat')) return path.basename(assetPath);
				return path.join('dist', assetPath);
			}
		}),
		new RemovePlugin({
			after: {
				include: [path.join(__dirname, 'build', 'dist')]
			}
		})
	]
};
