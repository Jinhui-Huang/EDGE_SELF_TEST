package com.example.webtest.dsl.model;

import java.util.List;
import java.util.Map;

public class TestCaseDefinition {
    private String id;
    private String name;
    private String description;
    private String version;
    private String env;
    private String baseUrl;
    private List<String> tags;
    private Map<String, Object> vars;
    private List<StepDefinition> beforeAll;
    private List<StepDefinition> steps;
    private List<StepDefinition> afterAll;
    private AssertPolicy assertPolicy;
    private ReportPolicy reportPolicy;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getEnv() {
        return env;
    }

    public void setEnv(String env) {
        this.env = env;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public Map<String, Object> getVars() {
        return vars;
    }

    public void setVars(Map<String, Object> vars) {
        this.vars = vars;
    }

    public List<StepDefinition> getBeforeAll() {
        return beforeAll;
    }

    public void setBeforeAll(List<StepDefinition> beforeAll) {
        this.beforeAll = beforeAll;
    }

    public List<StepDefinition> getSteps() {
        return steps;
    }

    public void setSteps(List<StepDefinition> steps) {
        this.steps = steps;
    }

    public List<StepDefinition> getAfterAll() {
        return afterAll;
    }

    public void setAfterAll(List<StepDefinition> afterAll) {
        this.afterAll = afterAll;
    }

    public AssertPolicy getAssertPolicy() {
        return assertPolicy;
    }

    public void setAssertPolicy(AssertPolicy assertPolicy) {
        this.assertPolicy = assertPolicy;
    }

    public ReportPolicy getReportPolicy() {
        return reportPolicy;
    }

    public void setReportPolicy(ReportPolicy reportPolicy) {
        this.reportPolicy = reportPolicy;
    }
}
