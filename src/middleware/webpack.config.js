const webpack = require('webpack');
const path = require('path');

module.exports = {
    entry: [
    // 'react-hot-loader/patch',
        'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000',
        // 'webpack-hot-middleware/client?http://localhost:3030/',
        './client/index.js',
    ],
    output: {
        path: path.resolve(__dirname, 'public'),
        publicPath: '/',
        filename: 'bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: [
                    {
                        loader: 'babel-loader'
                    },
                ],
            },
        ],
    },
    resolve: {
        modules: ['node_modules', path.resolve(__dirname, 'client')],
        extensions: ['.js'],
    },
    plugins: [new webpack.HotModuleReplacementPlugin()],
};
