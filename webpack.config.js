const webpack = require("webpack");
const path = require("path");
const autoprefixer = require("autoprefixer");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const ImageminPlugin = require("imagemin-webpack-plugin").default;
const TerserJSPlugin = require("terser-webpack-plugin");
const {MODE, SERVER} = process.env;
const IsDevelopment = MODE === "development";



const CssExtractLoader = IsDevelopment ? "style-loader" : MiniCssExtractPlugin.loader;
const PostcssLoader = {
  loader: "postcss-loader",
  options: {
    plugins: function () {
      return [
        autoprefixer
      ];
    }
  }
};


const webpackConfig = {
  entry: [
    path.resolve(__dirname, "./src/index.js"),
  ],
  output: {
    path: IsDevelopment ? __dirname : path.resolve(__dirname, "release"),
    filename: `drawing.${IsDevelopment ? "" : "min."}js`,
    publicPath: IsDevelopment ? "/" : (SERVER ? "/" : "/release/")
  },
  resolve: {
    extensions: ['.js'],
    alias: {}
  },
  mode: MODE,
  devtool: IsDevelopment ? "cheap-module-eval-source-map" : "cheap-module-source-map",
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: "babel-loader",
            query: {
              compact: false,
              cacheDirectory: true,
            }
          }
        ],
      },{
        test: /\.css$/,
        include: [
          path.resolve(__dirname, "src"),
          path.resolve(__dirname, "node_modules/antd")
        ],
        use: [
          CssExtractLoader,
          "css-loader",
          PostcssLoader,
        ]
      },{
        test: /\.scss$/,
        include: [
          path.resolve(__dirname, "src"),
        ],
        use: [
          CssExtractLoader,
          "css-loader",
          PostcssLoader,
          "sass-loader"
        ]
      },{
        test: /\.(woff|svg|ttf|eot|woff2)(\?.*)?$/,
        loader: "url-loader",
        exclude: /node_modules/,
        query: {
          limit: 5000,
          name: "iconfont.[ext]"
        }
      },{
        test: /\.(png|jpg|gif|ico)$/,
        loader: "url-loader",
        exclude: /node_modules/,
        query: {
          limit: 5000,
          name: "static/image/[name].[hash:8].[ext]"
        }
      }
    ]
  },
  devServer: {
    host: "localhost",
    port: 3000,
    historyApiFallback: true,
    hot: IsDevelopment || !!SERVER,
    stats: {
      colors: true
    }
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: `drawing.${IsDevelopment ? "" : "min."}css`,
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      favicon: "./src/assets/kszitt.ico",
      inject: true,
      template: "index.html",
      minify:  IsDevelopment ? false : {
        removeComments: true,
        collapseWhitespace: true,
        minifyJS: true,
        minifyCSS: true
      },
      hash: false
    }),
    new ImageminPlugin({
      disable: !IsDevelopment,
      pngquant: {
        quality: "50-60"
      }
    })
  ]
};

if(!IsDevelopment){
  webpackConfig.optimization = {
    minimizer: [
      new TerserJSPlugin(),
      new OptimizeCSSAssetsPlugin()
    ],
  }
}

module.exports = webpackConfig;
