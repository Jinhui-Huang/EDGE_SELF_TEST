plugins {
    application
}

dependencies {
    implementation(project(":libs:native-messaging"))
    implementation(project(":libs:execution-engine"))
}

application {
    mainClass.set("com.example.webtest.nativehost.NativeHostApp")
}
