plugins {
    application
}

dependencies {
    implementation(project(":libs:execution-engine"))
    implementation(project(":libs:native-messaging"))
    implementation(project(":libs:datasource-engine"))
    implementation(project(":libs:security-audit"))
}

application {
    mainClass.set("com.example.webtest.platform.CorePlatformApp")
}
