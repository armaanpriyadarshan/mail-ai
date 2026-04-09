module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated v4 moved its babel plugin into the react-native-worklets package.
    plugins: ["react-native-worklets/plugin"],
  };
};
