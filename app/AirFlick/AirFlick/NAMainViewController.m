//
//  NAMainViewController.m
//  airflick
//
//  Created by Nathan Teetor on 3/28/14.
//  Copyright (c) 2014 Nonstop Akubara LLC. All rights reserved.
//

#import "NAMainViewController.h"

@interface NAMainViewController ()

@property (nonatomic) int numRequestsSent;

@property (nonatomic) NSString *serverURL;
@property (nonatomic) NSMutableData *_responseData;

@property (nonatomic, weak) IBOutlet UILabel *sendRequestLabel;
@property (nonatomic, weak) IBOutlet UILabel *numRequestsLabel;
//@property (nonatomic, weak) IBOutlet UIButton *sendRequestButton;

@end

@implementation NAMainViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    // load self, or whatever
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    
    if (self) {
        self.serverURL = @"http://localhost:3000/device/hello";
        self.numRequestsSent = 0;
    }
    
    // return the main view
    return self;
}

// request methods (you tell me)

- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response {
    // A response has been received, this is where we initialize the instance var you created
    // so that we can append data to it in the didReceiveData method
    // Furthermore, this method is called each time there is a redirect so reinitializing it
    // also serves to clear it
    __responseData = [[NSMutableData alloc] init];
}

- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data {
    // Append the new data to the instance variable you declared
    [__responseData appendData:data];
}

- (NSCachedURLResponse *)connection:(NSURLConnection *)connection willCacheResponse:(NSCachedURLResponse*)cachedResponse {
    // Return nil to indicate not necessary to store a cached response for this connection
    return nil;
}

- (void)connectionDidFinishLoading:(NSURLConnection *)connection {
    // The request is complete and data has been received
    // You can parse the stuff in your instance variable now
    
    NSString *msg = [NSString stringWithFormat:@"%@",__responseData];
//    NSDictionary *jsonObj = [NSJSONSerialization JSONObjectWithData:__responseData options:0 error:nil];
//    NSString *msg = [NSString stringWithFormat:@"%@",jsonObj];
    
    UIAlertView *receivedData = [[UIAlertView alloc] initWithTitle:@"Data Received" message:msg delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil];
    
    [receivedData show];
}

- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error {
    // The request has failed for some reason!
    // Check the error var
    
    // throws error aka DOES NOT WORK
    
    [[[UIAlertView alloc] initWithTitle:@"Connection Error" message:@"Could not connect to server" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil] show];
}

- (IBAction)sendRequest:(id)sender {
    self.numRequestsSent++;
    
    self.numRequestsLabel.text = [NSString stringWithFormat:@"%i",self.numRequestsSent];
    
    // set URL
    NSURL *url = [NSURL URLWithString:self.serverURL];
    
    // send request
    NSURLRequest *req = [NSURLRequest requestWithURL:url];
    
    // create url connection
//    NSURLConnection *conn = [[NSURLConnection alloc] initWithRequest:req delegate:self];
    
    [NSURLConnection connectionWithRequest:req delegate:self];

}

- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event {
    [[[UIAlertView alloc] initWithTitle:@"Alert" message:@"Touch detected!" delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil] show];
}

@end
