import React from "react"
import { StatusBar as RNStatusBar, Platform } from "react-native"

const StatusBar = ({ style = "light" }) => {
  return (
    <RNStatusBar
      barStyle={style === "light" ? "light-content" : "dark-content"}
      backgroundColor={Platform.OS === "android" ? "#1a1a40" : "transparent"}
      translucent={Platform.OS === "android"}
    />
  )
}

export default React.memo(StatusBar)