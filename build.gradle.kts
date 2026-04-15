plugins {
    `java-library` apply false
    application apply false
}

subprojects {
    group = "com.example.webtest"
    version = "0.1.0-SNAPSHOT"

    pluginManager.apply("java-library")

    extensions.configure<JavaPluginExtension> {
        toolchain {
            languageVersion.set(JavaLanguageVersion.of(21))
        }
    }

    tasks.withType<JavaCompile>().configureEach {
        options.encoding = "UTF-8"
    }

    tasks.withType<Test>().configureEach {
        useJUnitPlatform()
    }
}
