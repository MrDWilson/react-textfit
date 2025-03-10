'use strict';

const webpack = require('webpack');

const plugins = [
    new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
];

module.exports = {
    mode: process.env.NODE_ENV || 'development',
    module: {
        rules: [{
            test: /\.js$/,
            use: ['babel-loader'],
            exclude: /node_modules/
        }]
    },
    output: {
        library: 'react-textfit',
        libraryTarget: 'umd'
    },
    plugins: plugins,
    resolve: {
        extensions: ['.js']
    }
};
