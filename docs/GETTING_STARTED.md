# Getting started with Cellar

## In one minute: what are we building?

Suppose your application sends a CSV file to a customer each week. The customer expects a column called `order_id`. Someone changes the export to `id`. The CSV still opens, but the customer's import breaks.

**Cellar checks the export against agreed rules before it ships.** It reports which integration would break, explains the evidence and gives a release verdict.

The **Cellar Studio** platform is intended to apply that same evidence-first approach to other developer problems, such as build logs and database performance. Those products have their own repositories and different stages of maturity. They do not all run here.

## Choose your path

### I just want to see what Cellar does

Open the [Cellar Guard sample demonstration](https://cellar-csv.vercel.app/). It uses synthetic sample reports; it is **not** the full Java backend.

### I want to run the actual application

You need a **JDK 21 or later**.

```sh
git clone https://github.com/suryandugy-glitch/Cellar-Studio.git
cd Cellar-Studio
java Build.java test
sh run.sh
```

On Windows, use `run.bat` instead of `sh run.sh`. Open the URL displayed in the terminal (normally `http://127.0.0.1:8080`). The Java app can choose another port when 8080 is occupied.

In the local workspace, choose **Check → Breaking demo → Run check**. The expected teaching example shows an inventory integration failing its required-column rule. This is a deliberate sample, **not** proof that a real customer's data was tested.

### I want to code without installing Java

Use [GitHub Codespaces](https://github.com/codespaces/new?repo=suryandugy-glitch%2FCellar-Studio), select `main`, and create a Codespace. Its devcontainer installs Java 21 and Node 22 and runs the tests during setup. When it finishes, run `sh run.sh` and open the forwarded port in the **Ports** tab.

Codespaces may consume paid account quota. It does not automatically deploy to production.

## How to know your work is correct

```sh
java Build.java test
java -jar dist/cellar.jar validate
```

The first command compiles and runs the Java tests. The second checks the configured contracts. They do different jobs. For UI changes, also open the local site and test the affected path manually.

## Where your changes should go

- Java validation, API and the web UI bundled with the backend: this **Cellar-Studio** repository, until Guard is extracted into its own child repository.
- Static website and demo pages: this repository's `deploy/` code.
- Other Cellar Studio products, such as BuildClinic or PlanCliff: **their own repos**.
- Cross-product strategy, shared interfaces and documentation: `docs/CELLAR_STUDIO.md` and focused issues here, until a dedicated hub exists.

See the [codebase map](CODEBASE_MAP.md) and [development guide](DEVELOPMENT_ENVIRONMENT.md) for more.

## Common questions

**Is this the entire Cellar Studio platform?** Not yet. It is the existing Guard product plus the ecosystem's initial planning documents.

**Does the Vercel website run the Java backend automatically?** No. The static/demo site and the Java workspace are different deployments. For a remote workspace, follow [web deployment guidance](WEB_SECURITY.md).

**Do I need an AI key?** No. The core checker and built-in rule explanations work without one. AI assistance is optional.

**Can I use real customer CSV files?** Keep customer data local and follow your organization's policy. Never commit it to Git or attach it to public issues.

**What should a new teammate do first?** Run tests, reproduce a small issue with synthetic data, fix it on a branch and open a PR.
