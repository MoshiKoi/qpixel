import path from "node:path";
import webpack from "webpack";

export default webpack.defineConfig({
  mode: "production",
  devtool: "source-map",
  entry: {
    application: "./app/javascript/application.js"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ["ts-loader", "glob-import-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: "glob-import-loader",
        exclude: /node_modules/,
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    sourceMapFilename: "[file].map",
    chunkFormat: "module",
    path: path.resolve(import.meta.dirname, "app/assets/builds"),
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ]
});
