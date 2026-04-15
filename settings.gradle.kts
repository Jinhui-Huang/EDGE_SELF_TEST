pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
}

rootProject.name = "enterprise-web-test-platform"

include(
    "apps:core-platform",
    "apps:native-host",
    "apps:local-admin-api",
    "apps:desktop-launcher",
    "libs:common-core",
    "libs:common-json",
    "libs:dsl-model",
    "libs:dsl-parser",
    "libs:execution-context",
    "libs:execution-engine",
    "libs:cdp-client",
    "libs:browser-core",
    "libs:locator-engine",
    "libs:action-engine",
    "libs:wait-engine",
    "libs:assertion-engine",
    "libs:artifact-engine",
    "libs:report-engine",
    "libs:datasource-engine",
    "libs:security-audit",
    "libs:agent-adapter",
    "libs:native-messaging"
)
