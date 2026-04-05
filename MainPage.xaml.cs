using System.Globalization;

namespace MobileApp;

public partial class MainPage : ContentPage
{
    private const string WebRootFolder = "web";

    public MainPage()
    {
        InitializeComponent();
        AppWebView.Navigated += (_, __) => LoadingOverlay.IsVisible = false;
        Loaded += async (_, __) => await InitializeWebAppAsync();
    }

    private async Task InitializeWebAppAsync()
    {
        var webRoot = Path.Combine(FileSystem.AppDataDirectory, WebRootFolder);
        Directory.CreateDirectory(webRoot);

        foreach (var relativePath in WebAssetManifest.Files)
        {
            var destination = Path.Combine(webRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
            var destinationDir = Path.GetDirectoryName(destination);
            if (!string.IsNullOrEmpty(destinationDir))
            {
                Directory.CreateDirectory(destinationDir);
            }

            await using var source = await FileSystem.OpenAppPackageFileAsync(relativePath);
            await using var target = File.Create(destination);
            await source.CopyToAsync(target);
        }

        var entryFile = Path.Combine(webRoot, "App.html");
        var absolutePath = Path.GetFullPath(entryFile).Replace('\\', '/');
        var uri = new Uri($"file:///{absolutePath}");

        AppWebView.Source = new UrlWebViewSource
        {
            Url = uri.AbsoluteUri
        };
    }
}
